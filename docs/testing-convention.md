# Wekbench testing convention — two tests per build

Every feature build ships **two Momentic tests**, committed to the repo root as
`*.test.yaml`. The CI workflow (`.github/workflows/momentic.yml`) runs the whole suite on
every push to `main` and every pull request, so once a test is in the repo it runs after
every future build — automatically, forever.

A build is not "done" until both tests exist.

## The two tests

### 1. `<feature>.journey.test.yaml` — the user journey
The happy path a real person walks through the UI to get the value:

> sign in → do the flow → see the outcome they care about

Assert on the **customer-visible result** (the right page, the right data, the action
succeeded) — never on incidental DOM. One primary path per test; edge cases go in the
technical test.

### 2. `<feature>.technical.test.yaml` — the technical guarantees
The things that break silently underneath the happy path:

- public / no-login token pages load for an **anonymous** visitor
- persisted data **round-trips** (survives a page reload)
- **invalid / expired tokens** are rejected gracefully
- **tenant boundaries** hold (workspace A can't see workspace B)
- **error and empty states** behave

Momentic is browser-based, so it covers everything *observable in a browser*. For pure
database-level logic (e.g. an RLS edge case) pair a quick SQL/DB check alongside the
Momentic test and note it in the PR.

## Rules

- **Name and place** both files at the repo root: `<feature>.journey.test.yaml` and
  `<feature>.technical.test.yaml`.
- **Start from the templates** in `momentic/templates/` (they end in `.template` so the
  run glob ignores them). Copy, rename, fill in.
- **Reuse the sign-in block** and the `{{ env.WEKBENCH_EMAIL }}` / `{{ env.WEKBENCH_PASSWORD }}`
  credentials (set as GitHub repo secrets, inherited via the `ci` Momentic environment).
- **Be idempotent.** Use a unique title each run (`"... " + Date.now()`), create fresh
  records, and never depend on state left behind by a prior run.
- **Assert outcomes, not DOM.** A green suite that doesn't verify the outcome is worse
  than a red one. Never weaken an assertion just to make a test pass.

## Running locally

```
npx --yes momentic run --env ci
```

Requires `WEKBENCH_EMAIL` / `WEKBENCH_PASSWORD` available to the shell (the `ci`
environment has `inheritFromShell: true`). Tests run against `https://wekbench.com`, so a
feature must be **published** before its tests can pass.
