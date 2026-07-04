# Contributing

Thanks for improving GitMerit. This repository is a full-stack TypeScript workspace, so most changes should consider both the user-facing report experience and the backend data contract that powers it.

## Local Setup

```bash
pnpm install
pnpm dev
```

Open:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001/api`

## Before You Submit Changes

Run the standard checks:

```bash
pnpm lint:check
pnpm type-check
pnpm test
pnpm build
```

Run E2E tests when the landing page, routing, upload flow, or report screens change:

```bash
pnpm test:e2e
```

## Code Style

- Keep TypeScript types close to the API contracts they describe.
- Prefer existing dashboard primitives before introducing new UI building blocks.
- Keep controller logic thin and place business behavior in services.
- Add fallback rendering for AI-generated data because provider output can be unavailable.
- Avoid unrelated refactors inside feature changes.

## Documentation

Update documentation when behavior changes:

- `README.md` for product-level setup and overview.
- `docs/API.md` for endpoint or response-shape changes.
- `docs/ARCHITECTURE.md` for system structure changes.
- Package READMEs for frontend/backend-specific conventions.

## Pull Request Checklist

- [ ] The change has a clear user or maintainer benefit.
- [ ] Unit tests pass.
- [ ] Type-check passes.
- [ ] Lint passes.
- [ ] Build passes.
- [ ] E2E tests were run for user-flow changes.
- [ ] Documentation was updated where needed.
