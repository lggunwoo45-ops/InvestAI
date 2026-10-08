# Sprint 10.30 — Market open instrument list layout

- Base main: `538f8bbd9696b42d8e1048ede5f92a96287684b2`; user confirmed `git pull --ff-only origin main` was up to date.
- Branch: `feature/sprint-10.30-market-open-instrument-list-layout`.
- Asset tabs and the existing instrument search now share one workspace toolbar outside the instrument list. Search, provider filtering, and sorting retain their existing state transitions.
- The toolbar has one asset selector. Repeated search-behavior helper copy was removed; the existing market data and stock mock disclosures remain.
- Expanded desktop detail lists use 460–560px, with a 380–460px compact desktop range. Pending detail uses matching widths to avoid a horizontal jump while loading.
- Detail list symbols, names, and prices retain readable font sizes. Daily change stays visible on desktop; volume joins the table at wider desktop widths. Virtualized row heights remain unchanged.
- Hide/Show instruments and storage behavior remain intact. Search is hidden with the list, while asset tabs remain reachable.
- No density or view option was added. Chart, AI Copilot, Final Read, candidate, and decision calculation files were not changed.
- Regression coverage checks that search and the single asset selector share a toolbar outside the collapsible list; existing tests cover search, sorting, favorites, chart selection, and collapse persistence.

## Validation in this execution environment

- Lint: passed with the existing TanStack Virtual React Compiler warning.
- Typecheck: passed (`tsc --build --force`).
- Proxy tests: blocked before test execution by child-process `spawn EPERM`.
- Full frontend tests: blocked during Vite configuration loading by `spawn EPERM`.
- Production build: blocked during Vite configuration loading by `spawn EPERM`.
- These blocked checks require execution in the normal PowerShell environment before approval. No passing test or build result is claimed.
- Browser automation, executable launch, push, PR, merge, and deployment were not performed.

## User PowerShell validation — 2026-10-09

The user supplied the normal PowerShell execution output after the sandbox checks above:

- Proxy tests: 15 passed, 0 failed.
- Lint: 0 errors, 1 existing TanStack Virtual warning.
- Typecheck: passed.
- Frontend tests: 117 files and 537 tests passed.
- Production build: passed; 326 modules transformed.
- `git diff --check`: no diagnostics in supplied output; also checked directly in the repository.

The earlier `spawn EPERM` results describe the Codex sandbox restriction, not the outcome of the successful user-run validation.
