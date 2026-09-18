# Sprint 7.3 — Crypto / Stock workspace UI differentiation

## Scope

This is a presentation-only update on the merged Sprint 7.2 `main` commit `63336b5`. Market catalogs, sorting/query functions, providers, watchlist persistence, chart data, orderbook data, and AI placeholders remain unchanged. No Windows launcher or packaging files were edited.

## Before and after

| Area | Before | After |
| --- | --- | --- |
| Crypto explorer | Generic Market Explorer heading and neutral rows | Crypto Terminal heading, exchange/quote path, subdued pulse-green accents, visible quote badges, and stronger 24H-change emphasis. |
| Stock explorer | Same table framing as crypto; mock warning at the bottom | Stock Research heading, Korea/US board context, company-forward secondary text, board badges, blue-slate research treatment, and a mock-data warning beside the source badge. |
| Selected crypto | Shared three-column detail proportions | Chart remains primary, with orderbook and recent trades retained in the right activity rail. |
| Selected stock | Same detail proportions and symbol-first header as crypto | Company-first summary; a wider chart column and narrower activity rail at 1920/2560, and a shorter bottom activity strip at 1366. All existing market data panels remain. |
| AI Copilot | Same contextual subtitle for every asset | Crypto says “Market scenario context”; stock says “Company research context”. Both remain illustrative, with no AI model or prediction added. |

## Sorting controls

The sortable column headings are the primary controls in the full explorer. The duplicate field dropdown and direction button are hidden there. In the narrow selected-instrument navigator, they remain available because some column headings are intentionally not shown. The persistent sort status displays the active field, arrow, and direction; clicking an active column still reverses direction. The sort/query functions were not changed.

## Responsive layout notes

- **1366×768:** The selected workspace uses a two-column top area with a bottom orderbook/recent-trades strip. The stock strip is 190px (crypto 220px), leaving more vertical room for the chart. The compact navigator retains its search, favorites, result count, source warning, and sort fallback. Change/volume columns may be hidden in the compact navigator but remain available in its sort selector and detail.
- **1920×1080:** Crypto uses navigator/chart/activity proportions of 29/46/25; stock uses 27/51/22. The full explorer shows all sortable column headings.
- **2560×1440:** The same group-specific proportions have larger minimum widths and typography. Virtualized list scrolling remains unchanged.

These are code/CSS layout checks only. Per the sprint security boundary, no browser automation or EXE launch was used, so actual rendered clipping and console behavior at those viewports were not visually certified in this sprint.

## Validation and boundaries

- `npm run lint`: passed with the existing TanStack Virtual / React Compiler compatibility warning.
- `npm run typecheck`: passed.
- `npm run test`: 70/70 passed after updating UI assertions for the new workspace headings and stock detail hierarchy.
- `npm run build`: passed.
- No real trading, AI prediction, authentication, backend, or database work was added.
- No GitHub push, PR, or merge was performed.

## Remaining UI limitations and later work

- The selected-instrument navigator necessarily hides some columns at narrow widths. Its sort fallback and detail summary preserve access to those fields.
- Stock quotes and market activity remain simulations and are marked as such; live stocks are deferred.
- AI Copilot still shows the existing mock confidence and placeholder rationale, not analysis.
- A future sprint may address a full brand rename, Korean/English switching, real news integration, richer sector/fundamental research, a TradingView Markets-level redesign, and trading/order execution only after separate authorization and architecture review.
