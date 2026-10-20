# Upbit analysis startup performance

## Problem and change

The browser's shared Upbit gate spaces quotation REST calls and WebSocket handshakes by 10.5 seconds. Previously a cold analysis requested three quote catalogs, three candle histories and one socket handshake. This made seven paced operations, with roughly 63 seconds of pacing before live analysis.

- Load KRW, BTC and USDT catalogs in one `ticker/all?quote_currencies=KRW,BTC,USDT` request, then keep separate venue catalogs and original fetch timestamps in the service cache.
- Share pending catalog requests even when callers have independent abort signals. Cancel the underlying request only after all consumers leave. Ignore late responses from abandoned requests.
- Share analysis subscriptions by instrument identity, venue, quote, timeframe and requested mode. After the last viewer leaves, retain an already-live Upbit feed for 30 seconds. At most three idle timeframe feeds are retained. Pending/failed connections are closed immediately; idle connection loss also closes the retained session.
- Reuse the actively updated snapshot on return, retaining its original quote receipt and exchange timestamps. Nothing is persisted as a fake fresh quote. Reloading the document still starts a new session.
- AI Explore loads only its selected market bucket. Switching away cancels that bucket's pending catalog subscription, and switching back revalidates through the service cache. Instrument Analysis keeps cross-market search available; its three Upbit catalogs share the same batch.

Upbit's official [ticker-by-quote documentation](https://docs.upbit.com/kr/reference/tickers_by_quote) supports comma-separated quote currencies. The [Origin request limits](https://docs.upbit.com/kr/reference/rate-limits) still apply; the gate, retries, candle quality thresholds and gap exclusions are unchanged.

## Verification on 2026-10-20

Measured on the same PC and in-app browser using real Upbit BTC/KRW data. The baseline is deployed main `1b67e41`; the candidate is the production build served locally. Elapsed time starts immediately before document reload and ends when the visible live-quote analysis appears. These are individual observations, not a production latency guarantee; hosting, network and tool overhead differ.

| Scenario | Observed result |
| --- | --- |
| Baseline cold reload | 64,146 ms |
| Candidate cold reload | 42,693 ms (about 33% lower) |
| Candidate: News, then back within 30 seconds | 341 ms |

Both builds showed a live price, direction, entry watch zone, target and invalidation reference using two valid timeframes. The real hourly source gap remained excluded. No browser warning/error appeared on the working development route. The preview must use `/my-analysis?instrumentId=upbit-btc` without the trailing slash because the local build uses relative assets.

- Full `npm run check`: 152 files / 839 tests passed, typecheck, lint and build passed.
- Added final startup integration test: passed, then typecheck passed. Total coverage: 153 files / 840 tests across these runs.
- The integration test uses the real request gate with a fake clock and controlled transport: one catalog at 0 s, three histories at 10.5 / 21 / 31.5 s, one handshake at 42 s; no additional history requests or handshakes on warm return.
- Regression coverage includes quote-market separation, batch expiry/forced refresh, cancellation ownership, abandoned late responses, mode/timeframe/venue isolation, subscriber reference counting, original freshness timestamps, idle expiration/cap, connection-loss cleanup and AI bucket selection.
- Existing warnings: three lint warnings and a bundle above 500 kB. No new lint warnings.

## Limits and next step

Cold loading still takes tens of seconds. A hard refresh, different instrument, expired retention window, connection loss or exchange throttling can require loading again. Retention is in one browser document only; it does not share data across tabs or users. The bounded idle feeds consume a small amount of traffic for up to 30 seconds after navigation.

For consistently fast first visits, the next architecture step is a server-side quotation collector with shared history/quote caching, freshness metadata, request pacing and a bounded public read API. This PR does not provision hosting or alter the PC environment. Merge and deployment require the user's approval.
