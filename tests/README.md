# Tests

Shared, cross-cutting tests live here. Package-local tests live next to the code
they cover, as `src/**/*.test.ts`.

## Running

```bash
pnpm test          # run once
pnpm test:watch    # watch mode
```

## What belongs here

- Tests spanning more than one package.
- Tests of behaviour that is meaningful only at the repository level.
- Shared fixtures and helpers used by package tests.

## Configuration

`vitest.config.mts` at the repository root collects:

- `tests/**/*.test.ts(x)`
- `packages/*/src/**/*.test.ts(x)`
- `apps/*/src/**/*.test.ts(x)`

The runner is configured with `--passWithNoTests`, so a milestone that has not
yet introduced testable logic still passes `pnpm test`.

## Current state

Milestone 001 established the harness only. There is no product logic to test
yet, so there are deliberately no tests here — writing tests for behaviour that
does not exist would be noise. Each milestone adds tests alongside the
functionality it introduces, as required by `docs/AGENT_RULES.md`.
