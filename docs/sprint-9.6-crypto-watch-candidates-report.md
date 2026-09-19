# Sprint 9.6 — Usable Analysis Pilot: Crypto Watch Candidates

## Outcome

Sprint 9.6 replaces the empty AI Analysis page with a usable research shortlist for crypto. The screen ranks up to five Upbit KRW instruments from the current MarketDataService catalog and displays the exact evidence contribution, risk deduction, news provenance, and invalidation conditions behind every Watch Score.

This is not a real AI system. The engine is a pure deterministic function: it performs no fetch, uses no random values, calls no model, and does not predict a return. The score orders items for further human review; it is not a recommendation or probability.

## Scoring contract

- Momentum: 25 points maximum. Positive but non-extreme daily movement receives the strongest contribution.
- Volume / liquidity: 25 points maximum. The score uses the candidate's relative volume rank in the supplied catalog.
- Market context: 15 points maximum. BTC receives additional major-market context; all valid crypto instruments retain a visible baseline.
- News: 15 points maximum. Verified symbol-linked RSS may be instrument-specific. Local Proxy or browser RSS without a symbol link remains market-level context. Mock headlines receive only a small demo contribution and are explicitly labelled illustrative.
- Scenario completeness: 10 points maximum. Missing price, change, or volume is visible and produces an incomplete label.
- Risk penalty: up to 20 points deducted for missing data or extreme daily movement.

All final scores are clamped to 0–100. Equal scores use volume contribution and then symbol for stable ordering.

## Trust and evidence boundary

News Center, Market Briefing, Market Copilot, and the candidate screen continue to share the existing `NewsLoadResult`; the candidate engine does not make a second request. Local Proxy macro RSS is never presented as coin-specific evidence. Demo news is never presented as real. Each candidate shows source, scope, headline count, source disclaimer, and the global no-recommendation disclaimer in both English and Korean UI.

## Navigation and empty state

“Open in Market” reuses the existing instrument registry, workspace selection, and recently-viewed path. Catalog errors and empty data do not manufacture candidates: users can retry, open Market, or explicitly switch to the mock catalog.

## Preserved boundaries

No trading, real AI, API key, hosted backend, authentication, database, payment, subscription, or paid Sector Picks behavior was added. Existing news provider modes, Local Proxy, Market Explorer, Market Copilot, watchlists, charts, and launcher behavior are unchanged.

## Next steps

Sprint 9.7 may polish candidate review UX and add a local feedback loop. Paid Sector Picks remains deferred to 9.8, and any real AI API remains a planning and cost-control task for 9.9 before Beta.
