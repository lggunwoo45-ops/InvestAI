# Sprint 10.2 — Basic Stock Watch Candidates Foundation

## Outcome

The `/ai-analysis` workspace now separates Crypto, Korea Stocks, and US Stocks. The existing Crypto Watch Candidates experience remains intact. Korea and US tabs use the existing deterministic stock catalog and clearly identify the result as early-beta mock/limited research workflow data.

No stock candidate is created when its catalog is unavailable. The feature does not call a provider, AI model, backend, account, payment, or trading service.

## Candidate model

`StockWatchCandidate` extends the established candidate contract with:

- Korea or US region
- optional verified sector label
- live, mock, limited, or unavailable data-quality state
- a human-readable data-quality note
- stock evidence types covering momentum, liquidity, sector, news, market context, risk, and incomplete data

Existing crypto types and behavior remain compatible.

## Rule-based engine

The pure `stockWatchCandidateEngine` accepts only supplied instruments, region, existing NewsService state, language, horizon, and limit. It ranks at most five candidates using:

- momentum: up to 20
- relative catalog liquidity: up to 20
- market and available exchange context
- explicit instrument-linked news: up to 15
- data completeness: up to 15
- extreme-movement or missing-data penalty: up to -20

It never invents fundamentals, valuation, earnings, financial statements, analyst ratings, sectors, or headline causality.

## Korea and US behavior

Korea combines the existing KOSPI and KOSDAQ mock catalogs. US combines NASDAQ and NYSE. Company names, symbols, and exchange labels are preserved. Current quotes are deterministic simulations supplied by the existing stock provider, so cards are labelled `Mock / preview data` rather than live.

## Planning zones

Mock stock candidates receive text-only planning references:

- price/volume reaction review for short-term
- pullback/retest observation for swing
- thesis review for long-term
- follow-up evidence observation and invalidation/risk review

No entry, stop-loss, or target price is generated. The currently selected horizon is shared with the existing candidate workspace.

## Local feedback

Review status and notes reuse the existing local-only, instrument-ID keyed feedback store. This preserves crypto feedback compatibility and adds no backend or account sync.

## Market Radar

The Radar risk/trust notes now disclose `Stock candidate beta` coverage. It does not fabricate stock signals or add unavailable stocks.

## Investor demo relevance

The stock tabs demonstrate the future Korea/US review workflow while keeping data limitations visible. English and Korean labels cover beta status, quality, evidence, planning references, local feedback, empty states, and Market navigation.

## Deferred

- Real stock provider and production stock backend
- Real AI analysis
- Fundamentals, valuation, earnings, and sector-classification services
- Paid sector candidates
- Payment/subscription and user accounts
- Trading/order execution, database, telemetry, and cloud sync

## Manual route

Open `http://localhost:5173/ai-analysis` and switch between Crypto, Korea Stocks, and US Stocks. Manual browser validation is intentionally left to the user.

