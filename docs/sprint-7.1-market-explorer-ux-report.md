# Sprint 7.1 — Market Explorer UX and sorting

## Executive result

The existing Sprint 7 catalog, providers, virtualization, favorites, LIVE/MOCK behavior, chart, orderbook, recent trades, and AI Copilot context remain in place. This update changes presentation and sorting interaction only. The PR #5 Windows launcher files are unchanged.

## Sorting: before and after

Before, sorting was controlled by a small field selector and an unlabeled arrow. The active column was not highlighted, and selecting the same field did not provide a natural direction toggle. Alphabetical order followed the company name rather than the displayed symbol.

Now Symbol, Price, 24H Change, and Volume column headers are clickable. The active column is highlighted and shows an arrow; a persistent status line spells out the field, direction, and current result count. Clicking the same column reverses direction. A newly selected numeric field defaults to descending, while Symbol defaults to ascending. The field selector and explicit direction button remain available in narrow explorer layouts. Sorting operates on the active venue's filtered catalog, including after search and tab changes; virtual scrolling resets to the top when sorting changes.

## Workspace usability

- Stronger market group/provider/sub-market tabs and a breadcrumb show the current context. The source badge distinguishes a real public API catalog from mock data.
- The search field has stronger contrast and a visible scope note. Search remains active while sorting, but resets when switching market tabs. Empty results provide a clear-search action.
- Rows use more legible symbol/name hierarchy, aligned prices and changes, restrained positive/negative colors, a larger favorite target, and a stronger selected state.
- The selected instrument header now identifies the exact venue. Current price and 24H change are prominent, while the chart retains priority over orderbook and trades.
- At 1366×768, the detail workspace uses a wide chart above a side-by-side orderbook/recent-trades strip. At larger widths it uses three columns. The AI Copilot remains visible beside the workspace.

## Validation

- Lint: passed with the pre-existing React Compiler/TanStack Virtual compatibility warning in `MarketExplorer.tsx`.
- TypeScript: passed. Unit/integration tests: 40 passed. Production build: passed.
- Browser checks: 1366×768, 1920×1080, and 2560×1440; no document-width overflow or clipped AI Copilot.
- Price direction toggle checked in all nine supported sub-markets in MOCK mode. Price, change, volume, and symbol ascending/descending; search+sort; and tab-change sorting are covered by tests.
- Headless Chrome mock-catalog measurements: search 16 ms, sort 35 ms, scroll about 60 FPS over a 200-item stock list. These are local observations, not a hardware-wide performance guarantee.
- Browser console errors: 0 in the MOCK-mode validation. The brief initial LIVE catalog request was supplied by a local browser fixture because the validation browser has no public API network access.

## Known limitations

- At 1366px, the compact navigator shows Symbol and Price; change and volume remain available in the sort controls and selected detail. Wider layouts reveal more list columns.
- Korea and US quotes remain simulated. MOCK crypto catalogs remain intentionally small; LIVE public catalogs depend on network/provider availability.
- The React Compiler warning for TanStack Virtual remains. It does not fail lint or affect the measured virtual scrolling, but should be revisited when the library/compiler integration matures.
