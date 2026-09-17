# Sprint 7.2 — Market Explorer data, display, and watchlist fixes

## Scope and results

PR #6 remains open. This changes only the Sprint 7 web application and tests; PR #5's Windows launcher and packaging are untouched. No trading, AI prediction, authentication, backend, or real stock/news provider was added.

| Issue | Before | After |
| --- | --- | --- |
| Explorer favorites on Dashboard | Resolved only against a few representative instruments, usually `Unavailable` | Shared MarketDataService resolves Explorer IDs from expanded venue catalogs; user-touched identities are cached in bounded, validated local storage for restart/offline display. Genuinely unknown IDs retain a removable `Unavailable` row. |
| Recently Viewed | Explorer-only IDs were silently omitted | Uses the same resolution path and keeps unknown IDs visible as disabled `Unavailable` entries. Selected instrument metadata, including provider symbol and venue, is preserved when opening a recent item. |
| Small prices | Fractional KRW could show `₩0` | Adaptive precision preserves nonzero values, including `₩0.1`, `₩0.0001`, `0.000001 USDT`, and `0.00000001 BTC`. Quote units remain visible; invalid numbers show `—`. |
| Binance Spot | Mixed quote assets in a single list | Defaults to USDT; tabs isolate USDT, FDUSD, BTC, ETH, and Other. Search, sort, and favorites operate within the selected quote set without changing provider identity. |
| Alphabet sorting and formatting | Re-created collation options and number formatters in row work | Module-scope `Intl.Collator` and cached `Intl.NumberFormat` instances; deferred search keeps typing responsive. |
| Spot orderbook stream | Reused Futures `@depth10@500ms` and `a`/`b` fields | Spot uses `@depth10@100ms` and `asks`/`bids`; Futures retains `@depth10@500ms` and `a`/`b`. Separate URL builder and payload tests. |

The Spot partial-depth stream format and 100 ms interval follow the [official Binance Spot WebSocket documentation](https://developers.binance.com/zh-CN/docs/products/spot/testnet/web-socket-streams). Selected `providerSymbol` is now used for both REST snapshots and streams. Aborted live detail loads now cancel their fetch requests, and non-finite catalog/provider values receive safe fallbacks. Legacy stock IDs are mapped to KOSDAQ or NYSE where appropriate rather than assumed to be KOSPI or NASDAQ.

## Changed files (29)

- Documentation: `docs/sprint-7.2-market-explorer-fix-report.md`.
- Explorer and pages: `frontend/src/components/market/MarketExplorer/MarketExplorer.tsx`, `MarketExplorer.module.css`; `frontend/src/pages/Market/MarketPage.tsx`, `marketExplorerQuery.ts`, `marketExplorerQuery.test.ts`; `frontend/src/pages/Dashboard/DashboardPage.tsx`; `frontend/src/pages/Discover/DiscoverPage.tsx`, `DiscoverPage.test.tsx`.
- Watchlist and Discover presentation: `frontend/src/components/smart-dashboard/WatchlistManager/WatchlistManager.tsx`, `WatchlistManager.test.tsx`; `frontend/src/components/discover/DiscoverTable/DiscoverTable.tsx`, `DiscoverTable.module.css`; `frontend/src/types/dashboard.ts`.
- Shared resolution and providers: `frontend/src/hooks/useResolvedInstruments.ts`; `frontend/src/services/market/instrumentRegistry.ts`, `marketDataService.ts`, `MarketDataService.test.ts`; `frontend/src/services/market/contracts/RealtimeMarketProvider.ts`; `frontend/src/services/market/explorer/UpbitCatalogProvider.ts`, `BinanceCatalogProvider.ts`, `StockCatalogProvider.ts`, `MarketCatalogProvider.test.ts`; `frontend/src/services/market/providers/UpbitMarketDataProvider.ts`, `BinanceMarketDataProvider.ts`, `BinanceMarketDataProvider.test.ts`, `providerUtils.ts`.
- Formatting: `frontend/src/utils/formatMarketValue.ts`, `formatMarketValue.test.ts`.

## Validation

- `npm run lint`: exit 0, one existing TanStack Virtual/React Compiler compatibility warning.
- `npm run typecheck`: exit 0 (`tsc --build --force`).
- `npm run test`: 55/55 tests passed, 12 files.
- `npm run build`: exit 0 (Vite production build).
- Browser automation at 1366×768, 1920×1080, and 2560×1440: Upbit KRW/BTC/USDT, Binance Spot/Futures, KOSPI/KOSDAQ, NASDAQ/NYSE tabs; all five Spot quote filters; search and sorting; Explorer favorite shown on Dashboard; recently viewed survives page reload. Zero browser console/page errors and zero horizontal document overflow.
- A deterministic intercepted public-API fixture was used for browser catalog checks. The Spot/Futures stream contract is verified by official documentation and unit tests; an end-to-end live-exchange WebSocket session was not available in this test environment and remains a user-PC validation item.
- Browser automation with 3,002 Spot/USDT fixture rows: search 43 ms, full-list sort 71 ms, scroll 61 frames/second in a one-second sample. These are local headless measurements, not a universal 60 FPS guarantee.
- Controlled 3,000-symbol alphabet comparator benchmark in the same browser: median old `localeCompare(..., { numeric: true })` 92 ms; cached `Intl.Collator.compare` 7.1 ms. Results vary by machine and dataset.

## Artifacts

Screenshots and the short demonstration GIF are stored outside the Git repository under `outputs/sprint7.2/`: `market-1366.png`, `market-1920.png`, `market-2560.png`, matching detail screenshots, `recently-viewed-1920.png`, and `sprint7.2-demo.gif`. The GIF illustrates the Spot list, favorite, symbol detail, and timeframe change. It is not an end-to-end real-market stream recording.

## Known limitations and Sprint 7.3

- Public API availability, CORS, rate limits, and exchange-side market changes depend on the user's network. No live exchange connection was asserted by fixture-based browser validation.
- Cached user-touched identity snapshots can show an older quote while offline; the live catalog refreshes on the next successful Explorer load. They are reference metadata, not executable trading prices.
- MOCK Binance Spot has only representative USDT pairs, so non-USDT quote tabs can be empty in offline mode. LIVE catalogs populate all supported quote groups.
- The Dashboard's manual add-symbol dropdown remains a small representative convenience list; any Explorer symbol can be favorited from the Explorer itself and then resolved in Dashboard.
- Deferred to Sprint 7.3: Crypto/Stock workspace visual redesign, TradingView Markets-like layout improvements, app/brand rename, and full AI forecast UI.
