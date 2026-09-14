# Sprint 5 CEO Report

## Executive status

- Sprint 5 scope: complete
- Estimated full-product completion: 38%
- Trading terminal UI foundation: production-oriented
- Live market coverage: Upbit spot and Binance USDⓈ-M Futures
- Execution, AI models, backend, authentication, and persistence: not implemented

## What changed

- Replaced the hand-built SVG mock chart with TradingView Lightweight Charts 5.2.1.
- Added public REST snapshots and WebSocket streams for Upbit and Binance Futures.
- Synchronized current price, 24-hour change, volume, recent trades, top-10 orderbook, and active candle.
- Added LIVE/MOCK selection, explicit provider identity, connection state, and reconnect attempt feedback.
- Added capped exponential reconnect for stream interruptions and initial snapshot failures.
- Preserved the original mock provider contracts behind the new service facade.
- Added provider-routing and fallback tests without connecting tests to external networks.

## Existing behavior changes

- Upbit and Binance instruments now default to LIVE mode. Users can explicitly switch to MOCK.
- Korea and US stock instruments use mock fallback because Sprint 5 defines no live provider for those venues.
- Market detail labels now show LIVE or MOCK instead of always showing simulated data.
- The chart interaction model now includes TradingView zoom, pan, crosshair, and price/time scales.

These changes are required to satisfy real-time behavior while preserving the existing symbol selection,
search, favorites, timeframes, orderbook, trades, and AI Copilot context.

## Repository constraint

At implementation time, GitHub `main` still pointed to the initial repository commit. Sprint 1 and Sprint 2/3
existed as unmerged branches, and no Sprint 4 branch or merged Sprint 4 implementation existed. Sprint 5 was
therefore built on the latest available InvestAI workspace lineage, which is still descended from the latest
merged `main`, so existing implemented functionality was not discarded. No Sprint 4 behavior could be audited
because no Sprint 4 code was present in the repository.

## Performance

- Market routes remain lazy-loaded.
- Lightweight Charts is isolated to the Market route chunk.
- Production build output: Market route 198.36 kB (63.70 kB gzip); shared application chunk
  270.22 kB (85.28 kB gzip).
- Local headless verification: DOM content loaded in 181 ms, load completed in 182 ms, with zero
  captured console errors. These timings describe the local development environment and are not a
  substitute for production field monitoring.
- Live ticks update only the latest chart bar after initial data load; user zoom is not reset per tick.
- Provider subscriptions are disposed when symbol, timeframe, mode, or route changes.
- Components receiving dense market data remain memoized.
- One exchange connection is active per selected instrument; reconnect delay is capped at 30 seconds.

## Verification

- ESLint: passed
- TypeScript (`tsc --noEmit`): passed
- Vitest: 3 test files, 7 tests passed
- Vite production build: passed (137 modules transformed)

## Remaining risk and recommendation

Sprint 6 should add deterministic provider contract tests with recorded exchange fixtures, sequence-gap
recovery for incremental orderbooks, heartbeat/latency monitoring, REST rate-limit governance, and an
environment-level provider configuration layer. Before any trading work, add authentication, encrypted API-key
storage, permission controls, audit logging, and explicit order confirmation boundaries.
