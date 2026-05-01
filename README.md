# DevScore

DevScore is a full-stack developer profile intelligence platform. It analyzes GitHub activity, LinkedIn positioning, and resume/CV PDFs, then turns those inputs into scores, summaries, missing keywords, and practical improvement roadmaps.

The project is intentionally built as a portfolio-grade full-stack application: a React/Tailwind client, a NestJS API, typed contracts, AI orchestration, PDF parsing, automated tests, and deployment-ready package boundaries.

## What It Does

DevScore gives software engineers a single place to understand how their public career signal looks to hiring teams.

- GitHub analysis: activity, project quality, technology diversity, consistency, flagship repositories, strengths, weak spots, and repository-level recommendations.
- LinkedIn analysis: profile completeness, headline quality, experience impact, skills relevance, personal branding, visibility keywords, and 7/30/60-day action plan.
- Resume/CV analysis: PDF extraction, professional score, ATS compatibility, issue-by-issue rewrites, missing keywords, formatting feedback, and a resume text preview.
- Multi-provider AI fallback: Gemini, OpenAI, and Groq are supported so analysis can continue if one provider is unavailable.
- Light SaaS dashboard UI: modern white-theme reports with score rings, metric cards, roadmaps, sidebars, keyword chips, and responsive layouts.

## Repository Layout

```text
portfolio-score/
├── packages/
│   ├── frontend/          # React 19, Vite, Tailwind CSS v4, TanStack Query
│   └── backend/           # NestJS 11 API, scoring, AI, GitHub, LinkedIn, CV modules
├── docs/                  # Architecture, API, and maintenance guides
├── .github/workflows/     # CI workflow for lint, type-check, tests, and build
├── package.json           # Workspace scripts
└── pnpm-workspace.yaml    # Monorepo package map
```

## Architecture At A Glance

```text
Browser UI
  |
  | Axios + TanStack Query
  v
NestJS API
  |
  |-- GitHub module: profile, repositories, activity, repository metadata
  |-- LinkedIn module: profile ingestion and visibility analysis
  |-- CV module: PDF upload and text extraction
  |-- Scoring module: activity, quality, stack diversity, consistency
  |-- AI module: structured prompts with provider fallback
  v
Structured report JSON
  |
  v
React dashboards
```

More detail is available in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Tech Stack

### Frontend

- React 19 and TypeScript
- Vite 7
- Tailwind CSS v4
- React Router
- TanStack Query
- Axios
- Lucide React
- Vitest, React Testing Library, Playwright

### Backend

- NestJS 11 and TypeScript
- GitHub API integration
- PDF parsing with `pdf-parse`
- AI SDKs: Google GenAI, OpenAI, Groq
- Validation with `class-validator` and `class-transformer`
- Jest and Supertest

## Getting Started

### Prerequisites

- Node.js 20 or newer
- pnpm 8 or newer
- At least one AI provider key for full AI reports
- Optional GitHub token for higher GitHub API rate limits

### Installation

```bash
git clone https://github.com/andriimaksymov/portfolio-score.git
cd portfolio-score
pnpm install
```

### Environment

Create `.env` in the repository root:

```env
PORT=3001
GITHUB_API_TOKEN=your_github_token
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
GROQ_API_KEY=your_groq_key
```

Only one AI key is required, but multiple keys improve fallback reliability.

### Run Locally

```bash
pnpm dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001/api`

## Main User Flows

### GitHub Portfolio Audit

1. Open the home page.
2. Select `GitHub Profile`.
3. Enter a GitHub username or profile URL.
4. Run analysis.
5. Review the score, metrics, flagship repositories, domain expertise, strengths, growth areas, and impact roadmap.

### LinkedIn Profile Analysis

1. Select `LinkedIn Profile`.
2. Enter a LinkedIn profile URL.
3. Run analysis.
4. Review visibility metrics, headline rewrite, about-section rewrite, experience improvements, missing keywords, quick wins, and action plan.

### Resume/CV Scanner

1. Select `Resume / CV`.
2. Upload or drag-and-drop a PDF.
3. Run analysis.
4. Review professional score, ATS compatibility, issue-by-issue rewrites, missing keywords, strength distribution, and top priority.

## API Overview

See [docs/API.md](docs/API.md) for request and response examples.

Key endpoints:

- `POST /api/analysis/analyze`
- `POST /api/linkedin/analyze-url`
- `POST /api/linkedin/analyze`
- `POST /api/cv/upload`

## Quality Checks

```bash
pnpm lint:check
pnpm type-check
pnpm test
pnpm build
```

Run everything used by CI:

```bash
pnpm check
```

Run browser E2E tests:

```bash
pnpm test:e2e
```

## Project Quality Signals Implemented

These items directly address the latest repository audit recommendations:

- Detailed root README with product flows, architecture, stack, setup, API links, and quality commands.
- Dedicated architecture guide in `docs/ARCHITECTURE.md`.
- Dedicated API guide in `docs/API.md`.
- Maintenance guide in `docs/MAINTENANCE.md` to support consistent updates.
- Contribution guide in `CONTRIBUTING.md`.
- CI workflow in `.github/workflows/ci.yml`.
- Actual resume drag-and-drop support in the UI.
- Explicit backend documentation so the full-stack NestJS layer is visible from the repository entry point.

## Roadmap

- Persist historical analyses for signed-in users.
- Add report export to PDF.
- Add profile comparison and peer benchmark views.
- Add richer repository health checks for README, tests, CI, licenses, and topics.
- Add a database-backed analysis history module.

## License

MIT. See [LICENSE](LICENSE).
