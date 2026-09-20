# Sprint 10.1 — Market Radar Dashboard Foundation

## Outcome

The existing Dashboard at `/dashboard` now opens with Market Radar: a compact, deterministic overview of active market evidence, unusual relative volume, volatility, watch candidates, and news themes. The existing watchlists, session pulse, discovery table, and latest-news modules remain below it.

Market Radar is not a recommendation screen. It performs no AI request, prediction, trade, or network request of its own.

## Data model

`MarketRadarSnapshot` separates the complete signal stream from five presentation groups:

- hot sectors
- unusual volume
- volatility radar
- watch candidates
- news themes

Each signal records its scope, evidence label, supported internal instrument IDs, status, provider source, and disclaimer. Missing inputs are represented as explicit `incomplete` signals and risk notes instead of throwing or fabricating data.

## Rule-based engine

`marketRadarEngine` is a pure deterministic aggregation boundary. It accepts the existing Upbit KRW catalog, current Crypto Watch Candidates, the shared NewsService result, language, and LIVE/MOCK mode. It has no provider, fetch, RSS, proxy, model, or trading dependency.

### Hot sectors

- Crypto appears only when crypto catalog evidence is available.
- Macro appears when real Local Proxy RSS macro articles are available.
- AI/technology appears only when those news categories exist.
- No unavailable stock, ticker, or sector is invented.

### Unusual volume

The top available instruments are ranked by relative catalog volume. The copy explicitly states that volume rank does not imply price direction.

### Volatility radar

Instruments with at least 5% absolute 24-hour movement appear. Movement of at least 10% receives `caution` status. This is a review flag, not a forecast.

### Watch candidates

The existing deterministic Crypto Watch Candidate engine supplies up to three top review items. Market Radar does not recalculate or modify Watch Score.

### News themes

Themes are derived only from the shared NewsService result. Macro articles remain market-level with no direct instrument action. Non-macro articles may expose only explicitly mapped, available internal instrument IDs. No headline causality is inferred.

## Open in Market

Signals show `Open in Market` only when they contain an available internal instrument ID. Market-level signals show a non-interactive label. The existing active-instrument and Recently Viewed path performs navigation.

## Language and trust boundary

All Market Radar labels and states have English and Korean copies. Symbols, exchange names, company names, and `Federal Reserve Board` remain unchanged. The interface continuously states that real AI is disconnected, output is rule-based, it is not investment advice, and the user makes the final decision.

## Deferred

- Real AI interpretation and AI Market Radar
- Paid Sector Picks
- Production news backend and generated Korean news summaries
- Portfolio-aware radar and alerting
- Trading/order execution
- User accounts, database, payment/subscription, cloud sync, and telemetry

## Manual route

Run the existing development server and open `http://localhost:5173/dashboard`. Manual browser validation is intentionally left to the user.

