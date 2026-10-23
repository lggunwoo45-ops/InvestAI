# Market & Risk Lab — BaroBara public-feature benchmark

Inspected 2026-10-23 (KST). This report describes local source changes, not a production deployment or a claim of complete parity.

Premium follow-up: the user's signed-in premium screens were inspected on the same date. See [the Korean premium benchmark and implementation acceptance criteria](barobara-premium-benchmark.ko.md). This follow-up adds research evidence; it does not mark premium features as implemented. No account settings, exchange connections, subscription or Telegram delivery were saved or changed.

Implementation follow-up: [local continual scenario monitoring](local-scenario-monitor.ko.md) now connects saved reviews and portfolio-linked scenarios to a persistent local monitor and sampled outcome ledger. This is single-owner local operation, not cloud deployment or complete premium parity.

## Entry points

### Signal Studio update — 2026-10-23

The `/research?mode=setups` workflow now uses an independently written Signal Studio, with original Korean descriptions and layouts. The initial five-condition implementation described later in this report is superseded **for this route**. Legacy review snapshots keep their original condition definitions so saved evidence is not reinterpreted.

Implemented locally:

- Thirty directional conditions (15 families), nine timeframes, 1/3/6/12-bar conjunction windows, historical EMA/volume filters, target/horizon/direction/cost controls, and 1,000/3,000/5,000-bar retrieval.
- Wilder RSI, EMA/MACD, Bollinger, squeeze expansion, volume, stochastic, prior-range breakout, engulfing/wicks, Williams %R, CCI and consecutive closes. Exact definitions are in the UI and shared `backend/research/signals.mjs`; matching a feature family does not assert that Barobara uses the same formulas.
- Ten-minute bars aggregate complete, aligned pairs of five-minute Binance USDⓈ-M bars. Indicators reset after gaps and require 60 warm-up bars. No current market statistics are applied retrospectively.
- A question-led Simple view with line chart and plain explanations; an Expert view with candles/EMA, searchable conditions and expanded controls. Both use the same calculations and preserve input across display changes.
- Actual sample rows, both-touch ambiguity, non-overlapping horizons, timeout results, cost-adjusted mean and Wilson interval. These are exploratory observations, not independently validated returns. Start/end coverage is visible.
- Up to 24 saved browser presets, explicit reload/delete, shareable configuration links without personal names/notes, and entry points from the primary instrument-analysis and market-chart screens.
- Persistent local condition monitoring, separately scheduled from the existing price monitor. A new condition transition records the original configuration, completed signal candle and subsequent price-bar outcome. Manual holding direction can restrict a watch to opposite signals. Restart, deduplication, stale history and gap behavior are tested. Telegram remains opt-in and requires the existing server channel configuration; live delivery has not been tested.

### Public position connections — 2026-10-23

User scope: prioritize analysis, integrations and alerts; defer paid subscriptions/payments. Added persistent, read-only Hyperliquid basic-perpetual and Lighter account-index connections with polling, original risk observations, pause/removal/export, and position-bound opposite signals. Simple cards and an Expert table share the same source data. This remains a single-owner PC implementation. See [public position monitor](public-position-monitor.ko.md) for precise coverage, source documentation and verification.

### Private API position connections — 2026-10-23

Added Binance/Bybit USDT perpetual adapters, read-only permission validation before registration and on every poll, and a password-derived AES-GCM local credential vault. The vault starts locked after process restart. Locking aborts requests and suspends bound signal decisions; removal deletes credentials with their connections. The UI guides local vault setup/unlock, explicit key storage/query consent, read-only registration and removal, with masked inputs cleared after attempts. Public connections and existing history remain intact. No live private account or Telegram delivery has been verified. See [private position monitor](private-position-monitor.ko.md).

Validation for private API connections: all 100 backend tests and 988 frontend tests passed, TypeScript and production build passed; lint retains only the same three pre-existing warnings. Fixtures and isolated temporary stores were used. No test credentials or connections were inserted into the user's monitor store.

### Remaining feature inventory

| Feature family | Current delivery | Remaining work / dependency |
| --- | --- | --- |
| Signal exploration | 30 conditions, 9 timeframes, windows, saved configurations and actual samples | Full-history/ETF-era datasets; funding/OI/taker/liquidation history alignment; independent strategy validation |
| Condition monitoring | Single-owner PC monitor, market condition and manually specified opposite-direction watches | Authenticated cloud operation and per-user storage/channel delivery |
| Signal outcome ledger | Original rule hash and local future-bar observations; all outcomes retained | Public sharing with redaction and server-authenticated archival |
| Strategy catalog | User-selected conditions and illustrative starting questions | Independently validated strategies, market-wide opportunity feed and verified frequency figures |
| Position risk | Manual calculator plus public and Binance/Bybit USDT perpetual observations, liquidation-distance/loss/provided-leverage checks | Real-account acceptance, exchange-wide margin modes and complete fill/realized-PnL history |
| Exchange account connections | Hyperliquid/Lighter public accounts; Binance/Bybit HMAC read-only adapters, per-poll permission checks, local encrypted vault, lock/removal | Live private-account compatibility, additional CEX/contract types, authenticated per-user cloud storage, exchange-side key revocation |
| Market context | Existing funding, OI, ratio, dominance and sentiment sources | Annual heat history, liquidation aggregation, automated ETF data and economic calendar |
| Cost/premium comparisons | Existing funding/fee budget and Upbit/Binance comparison | Additional domestic exchanges, bank FX, withdrawal/network availability and both-direction transfer comparison |
| Review and asset integration | Existing reviews/portfolio retained; direct analysis-to-signal-to-monitor navigation | Unified spot/derivative identity and separately licensed stock/commodity histories |
| Accounts and subscriptions | Payments explicitly deferred by user; public-position monitor is local/single-owner | Authenticated per-user storage and notification settings; billing is a later scope |

This is a substantial local functional update, **not complete feature parity or a public production deployment**. No reference-site wording, branding, observed performance numbers, account data or subscription configuration was copied.

Validation for this update: full frontend suite 982 tests and backend suite 83 tests passed; TypeScript and production build passed. The only lint warnings are three pre-existing warnings. Browser verification used actual BTC 1h/10m histories. The new monitoring HTTP tests used isolated temporary storage and a test notification adapter, leaving the user's existing monitor ledger unchanged.

- `/research` from Home, the expert resource menu, or Simple Mode → More.
- Modes use `?asset=BTC&mode=overview|indicators|position|costs|premium|setups|journal|alerts|guide`.
- Existing chart/news/watchlist workspaces remain in place. Research can add a real Upbit instrument to the existing watchlist; its USDT futures review observations are separate from the existing KRW chart snapshots.

## Implemented public workflows

| Reference feature family | Local behavior | Important boundary |
| --- | --- | --- |
| Market context | Mark price, funding, closed-hour chart and current deterministic conditions | Provider timestamps, failures and stale values stay visible; no fallback demo quotes |
| Indicators | Fear/Greed, BTC/ETH dominance, USDT+USDC share, OI/history, account ratio, taker ratio, realized volatility | Stablecoin share explicitly covers only USDT+USDC; recent funding percentile is not a one-year composite heat score |
| Position risk | Long/short notional, PnL, ROE, fees, signed funding and approximate isolated liquidation | Constant MMR linear USDT assumption; no cross-margin or exchange risk-tier calculation |
| Public wallet | Hyperliquid basic USDC perpetual positions and provider-reported liquidation prices | Explicit public-address request; no wallet signing, credential, logging, persistence or server cache |
| Cost comparison | Editable exchange scenarios, normalized Binance/Bybit/OKX/Bitget/Hyperliquid funding, maker/taker entry/exit, month/year budget, asymmetric payoff breakeven | No guessed fee schedules; funding must have a usable interval and time; HL uses USDC |
| Premium | Same-time Upbit/Binance prices, explicit USDT/KRW conversion, per-coin table and one-route transfer-cost calculator | No bank FX feed, Bithumb feed, network/withdrawal-status verification or executable arbitrage ranking |
| Signal combinations | Five independently calculated conditions, configurable target/horizon/direction/cost, sample counts, timeout/ambiguous outcomes and Wilson interval | At most 1,000 hourly candles; no claim of long-term validation, real AI prediction, independent holdout or future probability |
| Review loop | First review, note, timestamped baseline, next-visit mark/funding/OI/volatility/condition comparison and retained history | Browser-only storage, 100 observations; storage failure never reports success; stale current mark disables saving |
| News evidence | Existing real provider articles explicitly linked to the selected asset, with original-source links | No mock articles, inferred causal explanations or invented related news |
| Alerts/results | Saved reviews/scenarios → local continual monitor → immutable registration evidence, sampled outcome ledger and JSON export; optional server Telegram adapter | PC and monitor process must run. Channel setup/real delivery unverified; no real fills, intrapoll first-hit claim or long-term strategy performance. Legacy browser alerts remain available separately. |
| Guide/glossary | Public explanations, formulas, sources and operating limitations | Original UI and code; no copying of branding, mascot or private statistics |
| ETF record tool | Strictly labeled manual daily-flow CSV with date/source validation and sum | No automatic verified ETF flow provider; unsaved session-only input |

## Still required for the requested full scope

These items are **not implemented** and are not represented as complete:

- A verified historical dataset and collector for a one-year composite heat percentile and longer independent signal validation. Recent OI APIs and 1,000 candles do not substitute for this.
- Verified automatic ETF flow, all-stablecoin capitalization, economic-calendar, liquidation-stream, Bithumb and bank-FX sources, including usage rights and freshness policy.
- Multi-asset equities/commodities coverage and matching research inputs. Existing stock capabilities are not expanded by this change.
- Cloud continual monitoring, verified external delivery, two-lane signal opportunity/position outcomes and reproducible long-term performance. Existing portfolio scenarios can now be explicitly registered with the local monitor, retaining their original venue and quote currency.
- Account login, subscription entitlements, payment provider and notification-channel setup.
- Premium execution beyond the inspected UI: exchange synchronization, continuous monitoring, actual notification delivery, billing lifecycle and reproducible strategy validation. The user supplied an already signed-in premium session; no premium account was created or paywall bypassed by the agent.

Reference pages inspected: https://barobara.com/, `/setups`, `/methodology`, `/fees`, `/funding`, `/kimp`. The premium follow-up also inspected alert forms, subscription presentation, and `/signals` with an individual result. Some pages were readable only through the browser. UI observation is separate from end-to-end delivery and validation of the site's statistical claims.

## Run and deploy

`npm run dev` in `frontend` mounts `/api/research/*` on the local Vite server. The existing production market-data entry point now composes the same read-only research handler. The frontend uses `VITE_RESEARCH_URL` (an HTTPS `/api/research` base) when configured, otherwise the origin of `VITE_UPBIT_RELAY_URL`; without a production server it reports disconnected and leaves manual calculators usable. No API keys are sent to the frontend.

Standalone: `node backend/research/server.mjs`, with `HOST`, `PORT` (default 8791) and `UPBIT_ALLOWED_ORIGINS`. The handler uses fixed provider URLs, asset allowlists, request/concurrency limits, timeouts, shared in-flight requests and bounded-duration caches. Wallet requests use a bounded JSON body and no cache. Deployment of the changed backend and static frontend is a separate remaining step; no live service was changed in this task.

Checks: `node --test --test-isolation=none backend/research/server.test.mjs`; frontend typecheck/lint/build and targeted Vitest suites for calculations, review persistence, UI flow, navigation and application integration. Record actual final results below after completion.

## Verified results

- Final targeted frontend run: 7 files, 54 tests passed, including five-minute PC clock skew, HTTP cache Age, unfinished candles, baseline persistence/reload, cost math and app integration.
- Market relay, relay verification and research backend: 27 tests passed. Pages packaging: 2 tests passed (including direct `/research` entry).
- Typecheck and production build passed. Lint passed with the same three pre-existing warnings in MarketExplorer, MyAnalysisReportSummary and the test provider helper; no new warning remains.
- Real browser checks on `http://127.0.0.1:4191/research`: first save → reload → baseline restored; all five funding exchanges rendered; multi-coin premium table rendered; manual risk example calculated notional 1,000, PnL 100, fees 1.05 and net 98.95 USDT.
- Source freshness uses upstream HTTP Date + cache Age + local elapsed time. Local clock skew is not interpreted as stale market data, and unfinished candles use exchange time.
- Preview-only note explicitly labeled `기능 확인용 기록` was saved in the preview origin's local storage. No production user records were changed.
- Screenshots: workspace root `investai-research-journal.png` and `investai-research-risk.png`. These show the local preview, not the live website.
- Docker source packaging includes `backend/research`; backend test discovery includes its tests. No container deployment, remote commit, push, account creation, payment, Telegram message or trading action was performed.
