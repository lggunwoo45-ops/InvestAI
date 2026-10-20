# Upbit chart and analysis startup performance

## Problem and change

The browser's shared Upbit gate spaces quotation REST calls and WebSocket handshakes by 10.5 seconds. Previously a cold analysis requested three quote catalogs, three candle histories and one socket handshake. This made seven paced operations, with roughly 63 seconds of pacing before live analysis. A market chart also started a daily technical-analysis request, competing with the selected interval, and showed no chart until history arrived.

- Load KRW, BTC and USDT catalogs in one `ticker/all?quote_currencies=KRW,BTC,USDT` request, then keep separate venue catalogs and original fetch timestamps in the service cache.
- Share pending catalog requests even when callers have independent abort signals. Cancel the underlying request only after all consumers leave. Ignore late responses from abandoned requests.
- Share analysis subscriptions by instrument identity, venue, quote, timeframe and requested mode. After the last viewer leaves, retain an already-live Upbit feed for 30 seconds. At most three idle timeframe feeds are retained. Pending/failed connections are closed immediately; idle connection loss also closes the retained session.
- Reuse the actively updated snapshot on return, retaining its original quote receipt and exchange timestamps. Reloading the document still starts a new live session.
- AI Explore loads only its selected market bucket. Switching away cancels that bucket's pending catalog subscription, and switching back revalidates through the service cache. Instrument Analysis keeps cross-market search available; its three Upbit catalogs share the same batch.
- Prioritize the selected market chart (20), then analysis (10), then background daily levels, scenario monitoring and home warmup (0). Select the highest current subscriber priority when the next slot opens, including socket handshakes. Equal priorities remain FIFO. An in-flight request is not interrupted and the 10.5-second boundary is unchanged.
- Store only successful Upbit candle histories for display-only previews: at most 12 instrument/timeframe entries, 120 candles each, valid for 15 minutes. Validate storage size, schema, OHLC/volume, ordering, identity and timestamps. Corrupt, unavailable or full storage falls back safely without blocking live loading. Portfolios are untouched.
- On a market return or reload, show the saved chart with its receipt time while requesting fresh data. Preview candles are never published into active market state or analysis, and contain no cached live quote, trade or order-book feed. Fresh histories replace the entire chart, including corrected older bars; live ticks still update incrementally.
- On Home (`/dashboard`), prepare daily, four-hour and hourly data for one recent KRW instrument, falling back to BTC. The status means feeds are connected, not that every timeframe passes analysis quality checks. Opening analysis reuses connected subscriptions. The app's existing root redirect to Market is unchanged. Home does not preload every instrument.
- Price-only instrument updates no longer restart the selected chart subscription. Late callbacks after a symbol change are discarded.

Upbit's official [ticker-by-quote documentation](https://docs.upbit.com/kr/reference/tickers_by_quote) supports comma-separated quote currencies. The [Origin request limits](https://docs.upbit.com/kr/reference/rate-limits) still apply; request spacing, retries, candle quality thresholds and gap exclusions are unchanged.

## Verification on 2026-10-20

Measured on the same PC and in-app browser using real Upbit data and production builds served locally. These are individual observations, not a production latency guarantee; hosting, network and tool overhead differ. The cold comparison below was measured at the first optimization commit `bc978be6`; the additional home/market measurements use the final changes in this PR. Cold reload timing starts immediately before reload and ends at visible live-quote analysis; warm navigation timing starts before clicking the link. Preview timing ends when the saved-chart element is visible, before fresh data has arrived.

| Scenario | Observed result |
| --- | --- |
| Deployed main `1b67e41`, BTC/KRW cold reload | 64,146 ms |
| First optimization `bc978be6`, BTC/KRW cold reload | 42,693 ms (about 33% lower) |
| First optimization: News, then back within 30 seconds | 341 ms |
| Final changes: Home-prepared BARD/KRW → analysis | 348 ms |
| Final changes: prepared BARD/KRW analysis → Market chart | 544 ms |
| Final changes: reload BARD/KRW Market → saved chart | 534 ms; 505 ms after the notice layout adjustment |

Both analysis builds showed a live price, direction, entry watch zone, target and invalidation reference using two valid timeframes. The real hourly source gap remained excluded. Final browser checks also confirmed saved preview → fresh chart, BTC/KRW selection → BARD/KRW return with retained live data, and the visible saved-chart notice after a document reload. No browser warning/error appeared. The local preview must use `/my-analysis?instrumentId=upbit-btc` without a trailing slash because the local build uses relative assets.

- Full `npm run check`: 154 files / 846 tests passed, typecheck, lint and build passed.
- Two added hook/home tests passed, followed by typecheck and lint. Total coverage: 156 files / 848 tests across these runs. The final saved-chart notice layout was visually verified and the production build passed again.
- The integration test uses the real request gate with a fake clock and controlled transport: one catalog at 0 s, three histories at 10.5 / 21 / 31.5 s, one handshake at 42 s; no additional history requests or handshakes on warm return.
- Regression coverage includes quote-market separation, batch expiry/forced refresh, cancellation ownership, abandoned late responses, mode/timeframe/venue isolation, subscriber reference counting, original freshness timestamps, idle expiration/cap, connection-loss cleanup and AI bucket selection. Additional tests cover queued priority promotion, preserved spacing, validated/expired/corrupt/full preview storage, preview isolation from active analysis, corrected historical chart bars, price-only updates and background home preparation.
- Existing warnings: three lint warnings and a bundle above 500 kB. No new lint warnings.

## Limits and next step

Unprepared multi-timeframe live analysis can still take tens of seconds. A hard refresh, unseen instrument, expired retention window, connection loss or exchange throttling can require fresh data again. A saved preview reduces blank-chart time; it does not speed up the exchange's fresh response or make cached history suitable for trading decisions. Home preparation takes time in the background, and leaving before connection completes cancels unfinished work unless another subscriber needs it. Selected charts outrank queued background work but cannot preempt an already-running request.

Live retention is in one browser document only; it does not share connections across tabs or users. Validated candle previews survive reloads in browser local storage. The bounded idle feeds consume a small amount of traffic for up to 30 seconds after navigation. The home warmup is limited to one KRW instrument; BTC/USDT-quoted symbols are not automatically preloaded there.

For consistently fast first visits, the next architecture step is a server-side quotation collector with shared history/quote caching, freshness metadata, request pacing and a bounded public read API. This PR does not provision hosting or alter the PC environment. Merge and deployment require the user's approval.
