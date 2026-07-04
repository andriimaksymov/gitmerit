# GitMerit Frontend

The GitMerit frontend is a React application for launching developer profile analyses and rendering report dashboards for GitHub, LinkedIn, and resume/CV inputs.

It uses a white-theme SaaS interface with score rings, metric cards, roadmap panels, keyword chips, and responsive two-column report layouts.

## Responsibilities

- Collect analysis input from the user.
- Support GitHub username/profile URL input.
- Support LinkedIn profile URL input.
- Support PDF upload by file picker and drag-and-drop.
- Display loading, error, and success states for each analysis flow.
- Render structured GitHub, LinkedIn, and CV report dashboards.
- Keep report components resilient when AI fields are missing.

## Tech Stack

- React 19
- TypeScript
- Vite 7
- Tailwind CSS v4
- React Router
- TanStack Query
- Axios
- Lucide React
- Vitest and React Testing Library
- Playwright

## Project Structure

```text
src/
├── api/                   # Axios client configuration
├── components/
│   ├── landing/           # Home page, hero, navbar, feature sections
│   ├── shared/            # ScoreRing, MetricCard, dashboard primitives
│   └── ui/                # Lower-level UI primitives
├── features/
│   └── analysis/
│       ├── api/           # Analysis API functions
│       ├── components/    # GitHub, LinkedIn, CV dashboards
│       ├── hooks/         # React Query hooks
│       └── types/         # Shared TypeScript report contracts
├── pages/                 # Route-level screens
├── lib/                   # Utility helpers
└── e2e/                   # Playwright tests
```

## Routes

- `/`: Landing page and analysis launcher.
- `/analysis/:username`: GitHub analysis dashboard.
- `/linkedin?url=...`: LinkedIn analysis dashboard.
- `/cv`: Resume/CV dashboard, reached after selecting a PDF from the landing page.

## Development

```bash
pnpm dev
```

Default URL:

```text
http://localhost:5173
```

The frontend expects the backend API to be available at the base URL configured in `src/api/client.ts`.

## Quality Commands

```bash
pnpm type-check
pnpm lint
pnpm test -- --run
pnpm build
pnpm test:e2e
```

## UI Implementation Notes

- Use `components/shared/ScoreRing.tsx` for circular report scores.
- Use `components/shared/MetricCard.tsx` for report metrics.
- Use `components/shared/DashboardPrimitives.tsx` for cards, pills, checklist rows, warning rows, and keyword tags.
- Keep cards at restrained radii and avoid nesting card surfaces unnecessarily.
- Prefer domain-specific report sections over generic marketing blocks.
- Keep empty and missing-AI states readable; reports should not break when `aiInsights` is `null`.

## User Interaction Details

- The landing page disables analysis until an input or file is selected.
- GitHub URLs are normalized to usernames before navigation.
- Resume uploads support both click-to-upload and drag-and-drop.
- LinkedIn and CV flows show light-theme loading and retry states.

## Future Improvements

- Add PDF export implementation for reports.
- Add persisted report history when a database is introduced.
- Add comparison mode for multiple GitHub profiles.
- Add visual regression snapshots for dashboard layouts.
