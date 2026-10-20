# Upbit cold-data path: public market relay

## Cause and scope

The slow path was not the chart renderer. The deployed browser requested catalogs,
candle histories and WebSocket handshakes through a shared 10.5-second Origin gate.
More analysis timeframes increased the number of slots before usable data arrived.
The prior chart-preview cache did not remove this first-request delay.

A two-request diagnostic on 2026-10-20 received the same public 120-bar BTC history
in 95 ms with the site's Origin header (`group=origin; sec=0`) and 24 ms from Node
without a browser Origin (`group=candles; sec=9`). This isolates transport response
time from the app's multi-second wait. These are individual observations, not an
exchange availability guarantee.

Official references:
- [Upbit request limits](https://docs.upbit.com/kr/reference/rate-limits)
- [Origin policy](https://docs.upbit.com/kr/changelog/origin_rate_limit)

## Change

- Route the same public catalogs and candle requests through a fixed, read-only
  server adapter. It accepts only the application's catalog and six candle paths,
  validated market codes and counts up to 200. It cannot forward arbitrary URLs,
  account operations, credentials or browser headers.
- Pace server REST calls at 125 ms per quota group (at most eight starts/second),
  honor remaining capacity and 429/418 cooldowns, and bound queue/cache/response
  sizes. Identical pending requests share one upstream operation; cancellation of
  the last consumer aborts it. Successful data has a two-second cache with its
  original receipt time; errors never become cached successful data.
- Move Upbit WebSocket ownership to the server too. One socket per active market
  serves multiple viewers/timeframes. Connection starts are spaced by 250 ms.
  Browsers receive status and quotes over SSE. Preserve replay age, reject old
  generations, never replay trades, reconnect after errors/idle connections and
  close unused upstream connections.
- Keep the existing provider's quote freshness, exchange-clock checks, candle
  validation and gap exclusions. An open server connection alone is not a valid
  analysis quote. No portfolio, trading logic or user-facing feature is added.
- Share one browser SSE feed per market. Unlike the direct-browser fallback,
  release unused relay feeds immediately; idle feeds must not consume browser
  HTTP connection slots while another market is loading.
- Vite dev/preview provides the local adapter automatically. Public Pages uses
  `VITE_UPBIT_RELAY_URL` when configured. With no deployment URL, Pages retains the
  existing paced direct path. A configured relay failure does not silently switch
  to the slow direct route or simulated data.

## Verification (2026-10-20)

Production-build browser observations on the same PC:

| Observation | Elapsed |
| --- | --- |
| Deployed main: first SOL/KRW 1H chart after selecting SOL | 8,386 ms |
| Local relay build: first SOL/KRW 1H chart after selecting SOL | 291 ms |
| Local relay build: fresh XRP analysis document through valid-frame price plan | 991 ms; final build with local capability detection 971 ms |

SOL was not previously loaded by either test document. The measured element was
the latest-history chart, not the saved-preview element. The improved SOL view
also showed a live quote connection. XRP was measured after its two-second server
cache expired, with a fresh browser document and no retained browser subscription.
It displayed a live quote, two valid timeframes and a price plan; the real hourly
source gap remained excluded. Local hosting and production hosting differ, and
these measurements are not a latency SLA.

The standalone cold-server benchmark (`node backend/market-data/benchmark.mjs`)
also reports queue time separately from upstream response time through
`Server-Timing`. A previously unrequested ETH market produced these results:

| Request | Cumulative time | Queue | Upbit response |
| --- | --- | --- | --- |
| All quote catalogs | 151 ms | 0.1 ms | 81.0 ms |
| Daily 120 candles | 194 ms | 0.1 ms | 31.9 ms |
| Hourly 120 candles | 316 ms | 136.4 ms | 17.0 ms |
| Four-hourly 120 candles | 467 ms | 275.4 ms | 28.8 ms |
| First live ticker | 510 ms | — | — |

Every REST row was a server cache MISS. A second unseen market, DOGE, received all
three histories and its first ticker in 415 ms. Its last actual trade was older
than the existing 90-second analysis threshold during one browser check, so the
analysis remained withheld. Fast transport does not make an old trade fresh.

- Final full frontend check: 158 files / 853 tests, typecheck, lint and build passed.
- Backend: 20 tests passed (11 new public-market tests plus nine existing AI tests).
- Relay coverage includes cold three-frame loading without browser pacing,
  shared SSE subscriptions, original replay ages, disposal, direct-path fallback,
  failure without silent fallback, and static Windows launcher compatibility.
- Server coverage includes route/parameter/CORS/method validation, pacing,
  coalescing, cancellation, cache expiry, upstream cooldown, malformed/oversized
  responses, connection sharing, replay rules, recovery and HTTP/SSE cleanup.
- Existing three lint warnings and the bundle-size warning remain.

## Run locally

Existing `npm run dev` and `npm run preview` in `frontend` now serve `/api/upbit`
alongside the app, restricted to loopback requests. A one-time loopback health
probe (maximum 800 ms) enables the local adapter only when it is actually present.
The existing static Windows demo launcher keeps its direct path, instead of
mistaking every localhost server for a relay. No extra installation, API key,
PC setting, permanent service or separate startup command is needed for this path.

To test the standalone service:

```sh
npm run market --prefix backend
node backend/market-data/benchmark.mjs http://127.0.0.1:8790/api/upbit KRW-ETH
```

It binds to `127.0.0.1:8790` by default. Run the benchmark against a newly started
server or an unseen market; confirm `cache;desc="MISS"` rather than assuming a
warm result measures cold performance.

## Production wiring still required

GitHub Pages only serves the frontend. Merging this code alone will not activate
the fast relay path on the current public site. No hosting account, paid service,
public server, repository variable or production URL was created by this change.

1. Deploy `backend/market-data/server.mjs` on an always-on Node 22+ service with
   outbound HTTPS/WebSocket access to Upbit. Container build from repository root:
   `docker build -f backend/market-data/Dockerfile -t investai-market .`
   The Docker recipe is provided; a container build was not run in this environment.
2. Set `HOST=0.0.0.0`, the hosting service's `PORT`, and
   `UPBIT_ALLOWED_ORIGINS=https://lggunwoo45-ops.github.io`. No secret is required.
   Serve it over HTTPS. The reverse proxy must support streaming, disable SSE
   buffering and allow long-lived connections; prefer HTTP/2 to the browser.
3. Keep one instance per Upbit egress IP until a distributed limiter is added.
   The quota ownership and two-second cache are process-local. Multiple workers
   behind the same IP do not currently share their quota.
4. Set GitHub repository variable `UPBIT_RELAY_URL` to
   `https://<deployed-host>/api/upbit`. The Pages workflow passes it into the
   public build as `VITE_UPBIT_RELAY_URL`; it must never contain a key or token.
5. Build/deploy Pages, verify `/api/upbit/health`, then repeat first-market and
   first-analysis browser checks on the public site before calling rollout done.

Default bounds are 24 upstream markets, 128 downstream feeds, eight feeds per
network peer, 120 HTTP requests/minute/peer, 64 pending REST keys and 256 cached
histories/catalogs. Behind a reverse proxy, the peer limiter sees that proxy's IP;
configure appropriate trusted ingress limits/capacity before wider rollout.
The server deliberately does not trust arbitrary forwarded IP headers. These
bounds need load testing for a commercial multi-user service. A hosting platform
that sleeps can add a cold-start delay independent of Upbit.

Rollback: unset `UPBIT_RELAY_URL` and rebuild Pages to restore the paced direct
path. Existing local portfolios, watchlists and source-data safeguards are intact.

## Deployment verification and rollout plan (2026-10-20 follow-up)

The Pages workflow now verifies a configured relay **before** building/publishing
the frontend. A missing repository variable retains the current direct path.
A nonempty but broken URL fails the workflow, leaving the previous site deployed.
The check is also available independently:

```sh
npm run market:verify --prefix backend -- https://<deployed-host>/api/upbit
```

The check sends the real site's Origin, verifies its CORS response, reads the
catalog and three 120-bar BTC histories, and receives a fresh ticker through SSE.
It rejects redirects, incorrect health identities, missing freshness headers,
wrong markets, stale quotes/trades, and a proxy that returns HTML or buffers the
stream indefinitely. The total wait is bounded at 15 seconds. It reports queue
time, upstream time and HIT/MISS separately; a warm run is never labelled cold.

The exchange HTTP Date is carried as `X-Upbit-Server-Time`, preserving its original
value on cache hits. Verification compares quotes/trades to that exchange clock,
plus cache age and monotonic elapsed time, rather than the test PC's wall clock.
The local PC was approximately 311 seconds ahead of Upbit during this test.
The first verification exposed this difference; after correcting the diagnostic's
clock source, fresh data passed while old trades continued to fail. The
application's existing exchange-clock handling is unchanged.

Final live run from a newly started local server, no retained histories:

| Observation | Cumulative time |
| --- | --- |
| Relay health | 17 ms |
| Catalog (872 markets, MISS) | 176 ms |
| Daily history (120 bars, MISS) | 203 ms |
| First fresh BTC ticker (replay age 1 ms) | 240 ms |
| Four-hour history (120 bars, MISS) | 339 ms |
| Hourly history (120 bars, MISS); all checks complete | 459 ms |

The three history requests start together after catalog validation, as does SSE.
These measurements include real Upbit responses but no public hosting network
or browser render time. They do not replace the public-site acceptance test.

Follow-up validation: all 30 backend tests passed (including ten deployment-check
and health-quota tests); frontend typecheck, lint and production build passed.
The prior full frontend suite passed 853 tests, including on GitHub Actions;
frontend source code is unchanged in this follow-up. Three existing lint warnings
and the existing bundle-size warning remain.

The health route no longer consumes or depends on the client's data-request
quota, preventing a busy reverse-proxy peer from invalidating deployment health.
Origin and method validation still apply to health.

### Concrete first hosted trial

Railway was found as an available integration, but no connection/account was
confirmed and no hosted resource has been created. The account owner must connect
it before deployment can proceed. Start within the account's free trial if it is
available; do not upgrade or add a paid plan without the owner's authorization.

Use these settings when preparing the isolated relay service:

| Setting | Value |
| --- | --- |
| Repository | `lggunwoo45-ops/InvestAI` |
| Trial source branch | `perf/upbit-cold-data-path` (no main change) |
| Build context | Repository root |
| Dockerfile | `backend/market-data/Dockerfile` |
| Listen host | `HOST=0.0.0.0` |
| Port | Hosting `PORT`; image default 8790 |
| Browser origin | `UPBIT_ALLOWED_ORIGINS=https://lggunwoo45-ops.github.io` |
| Health check | `/api/upbit/health` |
| Replicas | One |
| Sleep/serverless | Disabled during latency testing |

Keep the image's start command. This service needs no database, volume, private
exchange key or portfolio upload. Choose an available nearby region, then test
outbound Upbit access and the actual public HTTPS/SSE path before wiring Pages.
Provider settings are described in the official
[Docker build](https://docs.railway.com/builds/dockerfiles),
[health check](https://docs.railway.com/deployments/healthchecks) and
[deployment](https://docs.railway.com/overview/advanced-concepts) documentation.
No untested provider configuration file or extra SDK is introduced.

After the check passes, set `UPBIT_RELAY_URL`, obtain the user's merge approval,
deploy Pages, and test a fresh browser document, unseen market selection, repeated
market switching, and analysis loading. Initial trial targets are under two
seconds for the first valid chart and under three seconds for the first usable
analysis under an ordinary connection; record repeated observations, including
failures, rather than treating this local sample as a production guarantee.
Measure fresh data separately from saved chart previews and retain the existing
data-quality exclusions. The existing peer limits can group users behind a hosting
proxy; ingress identity/capacity and multi-user load remain rollout checks before
inviting multiple testers.
