# DevScore — Production System Design

> Staff Engineer architecture review. Grounded in the actual codebase (NestJS
> backend, React 19 frontend, multi-provider AI with deterministic fallback,
> currently stateless). Living document — update as decisions land.

The single most important fact about this system: **it is a stateless,
synchronous, fan-out-to-third-parties request processor with no database.**
Every architectural decision below flows from that, and the central tension is
that our latency and reliability are owned by GitHub, OpenAI/Gemini/Groq, and
LinkedIn — not by us. Design accordingly.

---

## 1. Core User Flows

| Flow | Trigger | Critical path | Latency owner |
|---|---|---|---|
| **GitHub analysis** | username → `POST /analysis/analyze` | GitHub API (3 calls + per-repo content) → scoring → AI → response | GitHub rate limits + AI generation (5–30s) |
| **LinkedIn (URL)** | profile URL → `POST /linkedin/analyze-url` | Cheerio scrape → AI | Scrape fragility + AI |
| **LinkedIn (structured)** | form data → `POST /linkedin/analyze` | AI only | AI |
| **CV** | PDF upload → `POST /cv/upload` | pdf-parse → AI | AI |

**The flows are ~80% identical**: gather evidence → score (GitHub only) →
AI-generate with fallback → return. This shared shape is our biggest leverage
point and our biggest current duplication problem (audit P1/P3/P6).

**Missing from the flows today:** no result persistence, no shareable result
URL (`GET /:id` is a stub), no re-analysis/diff over time, no auth/identity.
These are the boundary between "demo" and "product."

---

## 2. Functional Requirements

**Have today:** multi-source ingestion (GitHub/LinkedIn/CV), deterministic
4-dimension scoring, evidence extraction, AI insights with 3-provider fallback +
deterministic floor, structured Zod-validated output.

**Missing / implied:**
- Persist & retrieve analyses by ID (stub exists; contract implied by frontend
  routing on `state.source`).
- Shareable public result pages — the viral growth loop for a tool like this;
  currently impossible because nothing is stored.
- Idempotency / caching (re-analyzing `octocat` re-burns GitHub quota + AI
  tokens every time).
- User accounts + history + re-scan-over-time (the retention hook).
- Async job model for slow analyses (CV + GitHub deep-dive can exceed a sane
  HTTP timeout).
- Webhooks/exports beyond client-side PDF.

---

## 3. Non-Functional Requirements (proposed targets)

These are *proposals* — none are written down today, which is itself a finding.

| Dimension | MVP target | Production target |
|---|---|---|
| Latency p95 (structured LinkedIn/CV) | < 15s | < 8s |
| Latency p95 (GitHub deep analysis) | < 30s | < 12s (async + cache) |
| Availability | 99% (single region, best-effort) | 99.9% |
| Throughput | ~5 concurrent analyses | 100s concurrent |
| Cost per analysis | track it (untracked today) | < $X, enforced via cache hit-rate |
| Result freshness | live every time | cache 24h, force-refresh option |

**Cost-per-analysis is the most dangerous blind spot.** Every request is an
uncached LLM call against `gpt-5-mini`/`gemini-2.5-flash`. At real traffic this
is the dominant variable cost and it scales linearly with use with zero
amortization. Caching is not an optimization here — it's a survival requirement.

---

## 4. Frontend Architecture

**Current:** React 19 + Vite + TanStack Query + Axios, SPA, static-deployable.
Good, boring, correct. Keep it.

**Decision — keep SPA, do not move to SSR/Next yet.**
- *Solution:* Static SPA on a CDN, talks to API via `VITE_API_URL`.
- *Alternatives:* Next.js SSR (shareable result pages with OG meta tags), Remix.
- *Tradeoff:* The moment we build shareable public result pages (`/r/:id`),
  we'll want SSR for social preview cards and SEO. That's the trigger to
  reconsider — not before.
- *Operational complexity:* SPA = trivial (push to CDN). SSR = a Node render
  tier to run, deploy, and scale.
- *Recommendation:* Stay SPA for MVP. When sharing matters, add a thin SSR layer
  (or edge pre-render) *only* for the result-page route, not the whole app.

**Action regardless of scale:**
- Delete the ~735 LOC of dead code (P2) — pure carrying cost.
- Kill type triplication (P3): Zod schema in backend → derive via `z.infer` →
  publish `@devscore/contracts` workspace package consumed by the frontend. The
  FE/BE contract has *already silently diverged*; this is a latent prod incident.

---

## 5. Backend Architecture

**Current:** NestJS modular monolith. **Right choice — keep it a monolith for a
long time.** Do not microservice this. Domains (github/linkedin/cv/scoring/ai/
analysis) are clean NestJS modules with zero deployment overhead. Premature
service-splitting buys distributed-systems pain for no throughput gain.

**Key decision: introduce an async job tier.**
- *Solution:* Split request into **enqueue** (fast, returns job ID) and
  **process** (worker pulls from queue, calls GitHub/AI, writes result).
  Frontend polls `GET /analysis/:id` or subscribes via SSE.
- *Alternatives:* (a) keep everything synchronous (current); (b) long-lived HTTP
  with streaming.
- *Tradeoffs:* Sync is simplest but couples HTTP timeout to the slowest LLM
  provider and is fragile to spikes (each slow request holds a connection).
  Async decouples ingestion from processing, enables server-side retries,
  smooths spikes, and makes caching/dedup natural.
- *Operational complexity:* Adds a queue (Redis/BullMQ) + a worker process.
  Moderate. Worth it.
- *Future scalability:* The single change that lets workers scale independently
  of API, absorb provider latency, and control cost. The scaling roadmap depends
  on it.

**Second decision: refactor `ai.service.ts` (1448 LOC god class, P1) into a
provider-strategy layer.** Not for aesthetics — it's the highest-churn,
highest-blast-radius file and it conflates *provider transport*
(OpenAI/Gemini/Groq SDK quirks) with *domain logic* (GitHub vs LinkedIn vs CV
prompting) with *fallback policy*. Split into: `LlmProvider` interface (one impl
per provider), a `FallbackChain` policy, and three thin domain analyzers. Adding
a provider, changing fallback order, or A/B-testing a model becomes a localized
change instead of open-heart surgery.

---

## 6. Data Storage Strategy

No storage today. Staged plan.

**Decision — PostgreSQL primary, Redis cache/queue, object storage for
artifacts.**
- *Postgres:* `analyses` (id, source, input_hash, scores JSONB, ai_insights
  JSONB, provider metadata, created_at), `users` (later), `share_tokens`. JSONB
  fits the AI output — already schema-versioned (`schemaVersion` in metadata)
  and semi-structured. Don't over-normalize insights; index the few fields
  queried on.
- *Redis:* (1) result cache keyed by
  `hash(source + normalized_input + schemaVersion + model)` — the cost killer;
  (2) BullMQ job queue; (3) rate-limit counters.
- *Object storage (S3/R2):* uploaded CV PDFs (if retained — see security/
  privacy) and server-side PDF exports.
- *Alternatives:* Mongo (unneeded — Postgres JSONB covers the document use case
  and gives relational integrity for users/sharing); all-in-Redis (no
  durability).
- *Tradeoff:* Two systems vs one, but the Redis cache pays for itself
  immediately in saved AI spend.
- *Cache key subtlety:* include `schemaVersion` and `model` so a prompt/model
  upgrade naturally invalidates; add a `force_refresh` bypass for "re-scan."

**Privacy = a storage-design constraint.** CVs and LinkedIn data are PII. Decide
*before* persisting whether to store raw PDF text or only derived analysis.
Recommendation: store derived analysis + a hash; discard raw PDF after
processing unless the user opts into history. Shrinks breach blast radius and
GDPR surface dramatically.

---

## 7. Communication Patterns

| Boundary | Current | Proposed |
|---|---|---|
| Browser ↔ API | REST/JSON sync | REST enqueue + **SSE or polling** for results |
| API ↔ Worker | (none) | Redis queue (BullMQ) |
| Worker ↔ GitHub | Axios sync | Axios + retry/backoff + ETag conditional requests |
| Worker ↔ LLM | SDK sync, sequential fallback | + per-provider timeout + circuit breaker |
| Worker ↔ LinkedIn scrape | Cheerio sync | Isolate + treat as best-effort (see risks) |

**Decision — SSE over WebSockets for result delivery.** Analysis is
one-directional (server → client progress + final result), short-lived, and SSE
rides plain HTTP (no sticky-session/LB complexity). WebSockets would be
over-engineering. Polling is the MVP fallback and is fine.

**LLM streaming:** stream AI insights token-by-token for perceived performance —
but only *after* the deterministic scores (instant) are rendered. Show scores
immediately, stream the prose. Makes a 15s analysis *feel* fast.

---

## 8. Scalability Requirements & Risks

**Throughput ceiling is not CPU — it's three external quotas.**
1. **GitHub API limits** — 60 req/hr unauthenticated, 5000/hr with a token; we
   make *multiple* calls per analysis (profile + repos + events + per-repo
   content/languages for top 5). *Mitigations:* authenticated token (supported),
   aggressive Redis caching (profiles change slowly), ETag conditional requests,
   eventually a token pool or GitHub App (per-installation limits).
2. **LLM provider rate/cost limits** — the existing fallback chain
   (`openai → gemini → groq → deterministic`) is good for *availability* but does
   nothing for *cost* or *throughput*. Cache first, then call.
3. **LinkedIn scraping** — does not scale; will get blocked/legally challenged.
   Most fragile thing in the system.

**Scaling design:**
- Stateless API + worker tiers → scale horizontally behind a load balancer. The
  async refactor makes workers the unit scaled on queue depth.
- Cache hit-rate is the lever that moves all three external limits at once. 60%
  hit rate cuts GitHub + AI load *and* cost by 60%.
- Per-source worker queues / priority lanes so a flood of CV uploads doesn't
  starve GitHub analyses.

---

## 9. Reliability Requirements

**Already good:** the deterministic fallback floor means the system *always
returns a result* even with all AI providers down. Keep it and make it explicit
in SLOs ("we always return scores; AI prose is best-effort").

**Gaps to close:**
- **Per-provider timeouts + circuit breakers.** Fallback triggers on *error*
  today, but a provider that *hangs* will stall the chain. Add per-provider
  timeout that trips fallback, plus a breaker so a degraded provider is skipped
  for a cooldown instead of timing out on every request.
- **Idempotency.** With async + retries, re-processing a job must be safe (keyed
  by input hash, upsert result).
- **Graceful GitHub-404/private-profile/rate-limit handling** as typed errors to
  the UI, not 500s.
- **Health checks** distinguishing "API up" / "can reach ≥1 AI provider" /
  "GitHub reachable."
- **No CI (P9)** is a reliability risk. Restore a pipeline running
  `lint + type + test + build` on every PR. Add tests for `scoring.service`
  first — 159 LOC of *core, untested* domain logic is where a silent scoring
  regression hides.

---

## 10. Security Requirements

| Area | Finding | Action |
|---|---|---|
| **CORS** | `origin: true` (reflects any origin) | Lock to known frontend origins per env |
| **No auth** | All endpoints open | Fine for MVP demo; add API-key/session before persisting user data |
| **Rate limiting / abuse** | None | Open endpoint that burns *our* AI budget per request = financial-DoS vector. Add per-IP rate limiting (Redis) **before** public launch — urgent |
| **File upload** | PDF only, `pdf-parse` | Validate magic bytes (not just MIME), cap size, sandbox parsing, strip after processing |
| **SSRF** | GitHub username & LinkedIn URL feed outbound HTTP | Validate/normalize: GitHub username regex; LinkedIn URL host allowlist = `linkedin.com`. Don't let users steer server outbound to internal IPs |
| **PII** | CV/LinkedIn data | Minimize retention (§6), encrypt at rest, define deletion path |
| **Secrets** | Provider keys in env | Secret manager in prod; never in frontend bundle |
| **Prompt injection** | Malicious README/CV can instruct the LLM | Prompts already say "use only supplied evidence, do not invent" — good. Reinforce input/output framing; never let model output drive privileged actions (it doesn't today — keep it that way) |

**Most urgent security item: rate-limiting + abuse protection on the analyze
endpoints before any public exposure.** An unauthenticated endpoint that triggers
paid LLM calls is an open door to running up the bill.

---

## Assumptions

1. Pre-PMF; optimizing for iteration speed over throughput is correct *today*.
2. Analyses tolerate eventual/cached freshness (24h-old score is fine to re-serve).
3. Traffic is bursty, human-driven, not a machine firehose.
4. Cost-per-analysis matters and is currently unmeasured.
5. LinkedIn scraping is a stopgap, not a long-term data strategy.
6. Shareable results are a likely near-term requirement (storage/SSR decisions
   hinge on this — **confirm with product**).

## Missing Requirements (need product input)

- Auth & multi-tenancy — are there accounts?
- Result persistence & sharing — public links? Expiry?
- Re-scan / history-over-time — the retention feature.
- Data retention & deletion policy for PII.
- Cost/SLO budgets.

## Technical Risks

- **`ai.service.ts` god class (P1)** — highest-churn, highest-blast-radius;
  refactor before it ossifies.
- **Type triplication (P3)** — FE/BE contracts already diverged; latent prod
  rendering bug.
- **Untested core scoring/github/cv services** — silent correctness regressions.
- **Synchronous request model** — couples latency to the slowest external dep.
- **Hang-not-error LLM failure mode** — fallback doesn't cover timeouts today.

## Scaling Risks

- **GitHub rate-limit exhaustion** at modest traffic (multi-call per analysis,
  single token).
- **Linear, uncached LLM cost** — the cost curve, not the load curve, bites first.
- **LinkedIn scraping breakage/blocking** — fragile, fails at scale.
- **Financial DoS** via unauthenticated paid-call endpoints.

---

## MVP Architecture (smallest correct step from here)

```
[CDN: React SPA] → [NestJS monolith on one container]
                       ├─ Redis (cache + simple rate-limit)        ← add
                       ├─ Postgres (persist analyses, share links) ← add
                       └─ External: GitHub, OpenAI→Gemini→Groq→deterministic
```

Still synchronous request/response (with streaming prose for UX), but now with:
result persistence + `GET /:id`, Redis result cache (the cost fix), per-IP rate
limiting (the abuse fix), CORS lockdown, SSRF input validation, restored CI +
scoring tests, and the `@devscore/contracts` shared-types package. **No queue
yet** — caching + persistence buy a lot before async is needed.

## Production Architecture

```
[CDN/SPA] ──→ [LB] ──→ [API tier (NestJS, stateless)]
                            │  enqueue job, return id
                            ▼
                       [Redis: queue + cache + rate-limit]
                            │
                            ▼
                  [Worker tier (autoscaled on queue depth)]
                    ├─ provider-strategy AI layer (timeouts + circuit breakers)
                    ├─ GitHub client (token pool + ETag + cache)
                    └─ writes → Postgres (analyses, users, share_tokens)
                                  + S3/R2 (PDFs, exports)
   Client ← SSE/poll for progress + result
   Observability: structured logs + traces + per-provider + cost-per-analysis
```

## Scaling Roadmap

**Phase 0 — Hygiene (now, low effort, high leverage):** delete dead code, shared
contracts package, CI + scoring tests, CORS lockdown, SSRF validation, **rate
limiting**, split `ai.service.ts`. No new infra required.

**Phase 1 — Persist & cache (MVP+):** Postgres + Redis cache, `GET /:id`,
shareable result pages, GitHub response caching with ETags. *Controls cost and
unlocks the growth loop.*

**Phase 2 — Async tier:** BullMQ queue + worker process, SSE progress,
per-provider timeouts + circuit breakers, idempotent retries. Decouples latency,
smooths spikes.

**Phase 3 — Scale out:** horizontal API + worker autoscaling on queue depth,
GitHub token pool / GitHub App, per-source queue lanes, multi-region if needed.

**Phase 4 — Platform maturity:** cost dashboards + budget alarms, model A/B
testing via the provider-strategy layer, replace LinkedIn scraping with an
official/licensed source or user-supplied-only, PII lifecycle automation.

---

**Bottom line:** the architecture is *correct for its stage* — a clean modular
monolith with a genuinely well-designed AI fallback chain. Don't rewrite it. The
three things that turn it into a production system, in order: **(1) cache +
persist** (controls cost, enables sharing), **(2) rate-limit + lock down**
(prevents financial DoS, the most urgent gap), **(3) go async** (decouples from
external latency). Everything else is sequencing.
