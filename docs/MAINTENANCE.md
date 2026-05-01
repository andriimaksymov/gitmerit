# Maintenance Guide

This guide supports the consistency recommendation from the repository audit. It defines a small, repeatable workflow for keeping the project healthy.

## Weekly Maintenance Checklist

- Run `pnpm install` after pulling changes.
- Run `pnpm lint:check`.
- Run `pnpm type-check`.
- Run `pnpm test`.
- Run `pnpm build`.
- Check whether GitHub, LinkedIn, and CV flows still render the expected loading, success, and error states.
- Review dependency updates before merging them.
- Keep screenshots or release notes for meaningful UI changes.

## Recommended Branch Workflow

```text
main
  |
  +-- feature/<short-description>
  +-- fix/<short-description>
  +-- docs/<short-description>
```

Before opening a pull request:

```bash
pnpm check
```

For changes touching routing, file upload, or report rendering:

```bash
pnpm test:e2e
```

## Commit Hygiene

Use focused commits that describe one logical change:

```text
docs: expand api documentation
feat: add resume drag and drop upload
test: update landing page e2e selectors
fix: handle empty ai insights in github report
```

This makes the GitHub activity timeline easier to understand and improves the quality of future portfolio analysis.

## Release Notes Template

```md
## Summary
- What changed?
- Why did it change?

## Verification
- [ ] pnpm lint:check
- [ ] pnpm type-check
- [ ] pnpm test
- [ ] pnpm build
- [ ] pnpm test:e2e, if UI flow changed

## Screenshots
- Before:
- After:
```

## Operational Notes

- Keep `GITHUB_API_TOKEN` configured for local and production environments to avoid rate-limit noise during demos.
- Configure at least two AI providers when possible so fallback behavior can be exercised.
- If a provider response shape changes, update `packages/backend/src/modules/ai/interfaces` and the affected dashboard fallback handling together.
- If CV parsing fails for a valid PDF, first inspect extracted text length before changing prompt behavior.
