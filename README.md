# GitMerit

> Turn your GitHub, LinkedIn, and résumé into a hiring-ready score with evidence-backed fixes.

[![CI](https://github.com/andriimaksymov/gitmerit/actions/workflows/ci.yml/badge.svg)](https://github.com/andriimaksymov/gitmerit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)
![pnpm](https://img.shields.io/badge/pnpm-%3E%3D9-orange)

GitMerit is a full-stack developer profile intelligence platform. It analyzes GitHub activity, LinkedIn positioning, and resume/CV PDFs, then turns those inputs into scores, summaries, missing keywords, and practical improvement roadmaps.

<!-- TODO: add live demo link and 2–3 screenshots/GIF here:
     1. Landing page
     2. GitHub dashboard for a real profile
     3. CV reviewer with a highlight tooltip open -->

## What It Does

- **GitHub analysis** — deterministic scoring (activity, project quality, stack diversity, consistency) enriched with AI insights grounded in real repository evidence: flagship repos, strengths, growth areas, and a prioritized roadmap.
- **LinkedIn analysis** — upload your exported profile PDF for a section-by-section assessment: score and status per section, current state, and recommendations anchored on your target title.
- **Resume/CV analysis** — PDF extraction, professional score, issue-by-issue rewrites with exact quotes, missing keywords, and a side-by-side original vs. improved view with clickable change highlights.
- **Runs with zero API keys** — every AI-backed report has a deterministic, evidence-based fallback, so the full product works locally without signing up for anything.
- **Saved, shareable reports** — with a Postgres URL configured, every analysis persists as an immutable snapshot with a shareable `/report/:id` link and a history view.

## Architecture

```text
gitmerit/
├── packages/
│   ├── frontend/          # React 19, Vite, Tailwind CSS v4, TanStack Query
│   ├── backend/           # NestJS 11 API: scoring, AI, GitHub, LinkedIn, CV modules
│   └── shared/            # Types-only contract package imported by both apps
├── docs/                  # Architecture, API, and maintenance guides
└── .github/workflows/     # CI: format, lint, type-check, unit + integration + e2e, build, audit
```

```text
Browser UI ──Axios + TanStack Query──► NestJS API
                                        ├── GitHub module: profile, repos, events, repo metadata
                                        ├── Scoring module: deterministic 4-dimension rubric
                                        ├── AI module: provider fallback chain + zod validation
                                        ├── LinkedIn module: PDF parsing + per-section assessment
                                        └── CV module: PDF extraction + quote-anchored rewrites
```

### Key design decisions

- **Types-only shared contract** ([packages/shared](packages/shared/src/index.ts)): the analysis shapes are declared once and imported by both apps; the backend keeps zod schemas for runtime validation with a compile-time tripwire that fails the build if a schema drifts from the shared contract.
- **AI provider fallback chain** ([ai-provider.client.ts](packages/backend/src/modules/ai/providers/ai-provider.client.ts)): OpenRouter → OpenAI → Gemini → Groq, ordered by `AI_PROVIDER_ORDER`. Every call has a 45s timeout, an output-token cap, structured-output (JSON schema) mode with a schema-repair retry, and zod validation. If everything fails, a deterministic analyzer produces an evidence-based report — the product never renders a blank screen because a vendor is down.
- **No invented data**: AI output is groundedness-checked against the supplied evidence (repository names, quoted resume text); ungrounded output is replaced by the deterministic fallback. Dashboards render explicit empty states rather than filler.
- **Deterministic scoring separated from AI insights** ([scoring.service.ts](packages/backend/src/modules/scoring/scoring.service.ts)): scores are pure functions of GitHub data with a named-constant rubric — fully unit-testable and reproducible; the AI layer only explains and recommends.
- **Dual-parser PDF pipeline** ([pdf.util.ts](packages/backend/src/common/pdf.util.ts)): unpdf (modern pdf.js) with a pdf-parse fallback for real-world exports, magic-byte validation, size caps, and parse timeouts.
- **Heavy libraries load lazily**: routes are code-split, and the two PDF libraries (~2 MB combined) ship only when a resume review actually opens.

## Security & Reliability

- Helmet security headers, strict CORS from a single env-driven source, 1 MB JSON body cap.
- Global `ValidationPipe` (whitelist + forbid unknown), DTO length caps on all free-text fields that reach AI prompts, GitHub username grammar validation against path injection.
- Uploads validated by magic bytes (not the spoofable Content-Type), capped at 10 MB, parsed under a timeout.
- Per-IP throttling globally (60/min) and per expensive endpoint (10/min); LinkedIn's per-section AI fan-out is concurrency-capped.
- Provider error details are logged server-side and redacted from client responses; GitHub rate limits surface as 503 with a friendly message, not anonymous 500s.
- No secrets in the repo: keys are read from environment config only (`.env.local` is gitignored).

## Testing

| Layer                    | Tooling                                               | Command                          |
| ------------------------ | ----------------------------------------------------- | -------------------------------- |
| Backend unit (44 tests)  | Jest                                                  | `pnpm test:backend`              |
| Backend API integration  | Jest + Supertest, mocked AI/GitHub                    | `pnpm --filter backend test:e2e` |
| Frontend unit (16 tests) | Vitest + Testing Library + MSW                        | `pnpm test:frontend`             |
| Browser E2E              | Playwright (dedicated port, no dev-server collisions) | `pnpm test:e2e`                  |

The integration suite drives the real HTTP pipeline (multer limits, validation, controllers, services, deterministic AI fallback) with only the outbound boundaries stubbed. Frontend tests regression-lock the "no fabricated data" rule: an empty API response must render explicit empty states.

Run everything CI runs:

```bash
pnpm check
```

## Getting Started

### Prerequisites

- Node.js 20 or newer (see `.nvmrc`)
- pnpm 9 or newer
- Optional: AI provider key(s) for AI-generated report sections
- Optional: GitHub token for higher GitHub API rate limits

### Installation

```bash
git clone https://github.com/andriimaksymov/gitmerit.git
cd gitmerit
pnpm install
```

### Environment

Create `.env` in the repository root (all keys optional — without them the backend uses deterministic fallbacks):

```env
PORT=3001
FRONTEND_URL=http://localhost:5173
GITHUB_API_TOKEN=your_github_token
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=openai/gpt-4o-mini
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
GROQ_API_KEY=your_groq_key
AI_PROVIDER_ORDER=openrouter,openai,gemini,groq
OPENAI_MODEL=gpt-5-mini
GEMINI_MODEL=gemini-2.5-flash
GROQ_MODEL=openai/gpt-oss-120b
```

See [.env.example](.env.example) for the full annotated list.

### Report history (optional)

Analyses can be persisted with shareable `/report/:id` URLs and a `/history` view. This
needs a Postgres database (free tier: [Neon](https://neon.tech)):

```bash
# 1. Add DATABASE_URL=postgresql://... to your .env / .env.local
# 2. Create the schema:
pnpm --filter backend db:push
```

Without `DATABASE_URL` everything else works normally — history simply stays disabled.

### Run Locally

```bash
pnpm dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001/api`

## API

See [docs/API.md](docs/API.md) for request/response examples.

- `POST /api/analysis/analyze` — GitHub portfolio analysis
- `POST /api/linkedin/analyze-pdf` — LinkedIn profile PDF assessment (multipart)
- `POST /api/cv/upload` — resume/CV analysis (multipart)
- `GET /api/reports` / `GET /api/reports/:id` — saved analysis history and shareable snapshots
- `GET /api/reports/status` — whether history is configured

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [CONTRIBUTING.md](CONTRIBUTING.md) · improvement plan and status: [docs/IMPROVEMENT_PLAN.md](docs/IMPROVEMENT_PLAN.md)

## Roadmap

- Live analysis progress via server-sent events.
- Job-description matching: score a profile against a specific posting.
- Durable (Redis-backed) rate limiting for serverless deployments.

## License

MIT. See [LICENSE](LICENSE).
