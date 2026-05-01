# Architecture

DevScore is a pnpm workspace with two production packages:

- `packages/frontend`: React application for input flows and report dashboards.
- `packages/backend`: NestJS API for data ingestion, scoring, AI prompts, and file processing.

The project keeps the frontend and backend independently deployable while sharing one repository, one lockfile, and one root-level quality workflow.

## System Flow

```text
User
  |
  v
React UI
  |
  | HTTP requests
  v
NestJS API
  |
  | data extraction
  v
GitHub / LinkedIn input / PDF text
  |
  | scoring + prompt orchestration
  v
AI provider fallback
  |
  v
Structured report JSON
  |
  v
Report dashboard
```

## Frontend Package

The frontend is responsible for interaction and presentation.

Important directories:

```text
packages/frontend/src/
├── api/                   # Axios client
├── components/
│   ├── landing/           # Home page sections and analysis launcher
│   ├── shared/            # Reusable report primitives
│   └── ui/                # Lower-level UI primitives
├── features/analysis/
│   ├── api/               # Analysis API functions
│   ├── components/        # GitHub, LinkedIn, CV dashboards
│   ├── hooks/             # React Query mutation hooks
│   └── types/             # Report contracts
├── pages/                 # Route-level screens
└── e2e/                   # Playwright specs
```

Key decisions:

- React Router owns page routing.
- TanStack Query owns server mutation and loading state for GitHub analysis.
- CV upload passes a `File` through route state before posting multipart form data.
- Report components receive structured result objects and handle fallback display for incomplete AI output.
- Tailwind CSS v4 provides the white-theme SaaS visual system.

## Backend Package

The backend is organized by domain modules.

```text
packages/backend/src/modules/
├── ai/                    # Provider clients, fallback, structured JSON prompts
├── analysis/              # GitHub analysis orchestration endpoint
├── cv/                    # PDF upload and parsing
├── github/                # GitHub API data fetching
├── linkedin/              # LinkedIn profile ingestion and analysis
└── scoring/               # Activity, quality, stack diversity, consistency
```

Key decisions:

- Controllers keep HTTP concerns thin.
- Services own data fetching and scoring behavior.
- AI output is requested as strict JSON so the frontend can render predictable dashboards.
- Provider fallback lets one failed AI service degrade gracefully instead of blocking the product.
- CV processing accepts only PDF uploads and extracts text before analysis.

## Scoring Dimensions

GitHub scoring currently evaluates four dimensions:

- Activity: public repositories, followers, recent events, and stars.
- Project quality: descriptions, homepage, size, topics, stars, update recency, issues, branch naming, and language metadata.
- Tech stack diversity: distinct primary languages across repositories.
- Consistency: active weeks in recent GitHub event history.

The final overall score is weighted toward project quality while still considering activity, diversity, and consistency.

## AI Fallback Strategy

The AI service initializes available providers from environment variables:

- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `GROQ_API_KEY`

Different flows can prefer a different provider order, but all flows are designed to try another provider if the first call fails. If every provider fails, the frontend still renders non-AI scoring data where possible.

## Data Boundaries

DevScore currently treats analysis results as request-scoped data. There is no database-backed history yet. That keeps local development simple and reduces privacy risk, but it also means historical reports and user accounts are future roadmap items.

## Deployment Notes

- Frontend can be deployed as a static Vite app.
- Backend can be deployed as a Node/Nest service.
- The frontend expects an API base URL configured by the Axios client environment.
- For production, configure provider keys and a GitHub token in the backend runtime environment.
