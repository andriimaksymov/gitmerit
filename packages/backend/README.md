# DevScore Backend

The DevScore backend is a NestJS API that powers developer profile analysis. It fetches or accepts source data, computes deterministic scores, asks AI providers for structured recommendations, and returns report-ready JSON to the React frontend.

## Responsibilities

- Fetch GitHub profile, repository, and event data.
- Score GitHub activity, project quality, stack diversity, and consistency.
- Accept LinkedIn profile URLs or structured LinkedIn profile data.
- Accept PDF resume uploads and extract text.
- Generate structured AI insights for GitHub, LinkedIn, and CV reports.
- Fall back across configured AI providers.

## Tech Stack

- NestJS 11
- TypeScript
- GitHub API integration
- Google GenAI SDK
- OpenAI SDK
- Groq SDK
- `pdf-parse`
- `class-validator` and `class-transformer`
- Jest and Supertest

## Module Map

```text
src/
├── modules/
│   ├── ai/               # Provider clients, prompts, fallback, JSON parsing
│   ├── analysis/         # GitHub analysis orchestration endpoint
│   ├── cv/               # PDF upload and text extraction
│   ├── github/           # GitHub data fetching
│   ├── linkedin/         # LinkedIn profile ingestion and analysis
│   └── scoring/          # Deterministic score calculations
├── config/               # Environment configuration
├── app.module.ts         # Root Nest module
└── main.ts               # API bootstrap
```

## Environment

Create `.env` in the repository root:

```env
PORT=3001
GITHUB_API_TOKEN=your_github_token
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
GROQ_API_KEY=your_groq_key
AI_PROVIDER_ORDER=openai,gemini,groq
OPENAI_MODEL=gpt-5-mini
GEMINI_MODEL=gemini-2.5-flash
GROQ_MODEL=openai/gpt-oss-120b
```

At least one AI provider key is needed for AI-generated report sections. If providers are unavailable, the backend returns deterministic evidence-based fallbacks with `analysisMetadata`.

## Development

```bash
pnpm start:dev
```

Local API:

```text
http://localhost:3001/api
```

## Endpoints

### GitHub

```http
POST /api/analysis/analyze
```

Body:

```json
{
  "username": "octocat"
}
```

### LinkedIn URL

```http
POST /api/linkedin/analyze-url
```

Body:

```json
{
  "url": "https://www.linkedin.com/in/example"
}
```

### LinkedIn Structured Data

```http
POST /api/linkedin/analyze
```

Body:

```json
{
  "fullName": "Alex Example",
  "title": "Software Engineer",
  "about": "I build production web applications.",
  "experience": [
    {
      "role": "Software Engineer",
      "company": "Example Co",
      "description": "Built React and Node.js applications."
    }
  ],
  "skills": ["TypeScript", "React", "Node.js"]
}
```

### CV Upload

```http
POST /api/cv/upload
```

Multipart form field:

```text
file: resume.pdf
```

Only PDF files are accepted.

## Scoring Details

GitHub scoring is deterministic and independent from AI provider availability.

- Activity: public repositories, followers, stars, and recent events.
- Project quality: description, homepage, size, topics, stars, recency, issues, default branch, and language metadata.
- Tech stack diversity: number of distinct primary languages.
- Consistency: active weeks in recent activity.

AI insights are layered on top of those scores to explain the results and produce recommendations.

## Quality Commands

```bash
pnpm lint:check
pnpm type-check
pnpm test
pnpm test:e2e
pnpm build
```

## Development Notes

- Keep controllers focused on HTTP concerns.
- Put orchestration and business logic in services.
- Keep AI responses strict JSON so frontend dashboards remain predictable.
- When adding fields to an API response, update frontend types in `packages/frontend/src/features/analysis/types`.
- When adding a new provider, implement it behind the existing `AiService` fallback pattern.
