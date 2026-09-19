# Sprint 9.1 — AI Scenario UX Polish / Decision Framework Upgrade

## What improved

The existing mock AI scenario foundation was reorganized into a compact decision flow for the right-side AI Copilot. The panel now reads from instrument identity and status, through evidence and possible paths, to risks and planning references. It remains deterministic mock UI: no AI model, recommendation, trade signal or calculated price level is present.

## Layout and scenario comparison

The forecast header now keeps symbol, company/asset name, market, **Mock scenario**, **AI inactive**, and chart/analysis timeframe together. The summary strip shows market bias, empty confidence, mock scenario status and the mock generation time. Confidence remains `—`; no artificial score is introduced.

A new **Scenario Map** compares the three paths before detailed cards:

- Bullish needs momentum and participation confirmation.
- Neutral can remain range-bound while evidence stays mixed.
- Bearish risk increases if observed support conditions weaken.

All three cards use the same size, border and neutral visual weight. Their status badges are **Watch**, **Wait**, and **Risk**; none is a buy/sell decision. Every card retains supporting conditions, an invalidation condition and a main risk.

## Evidence and planning reference

The new **Evidence Check** explicitly labels price action, volume and market regime as mock placeholders, news context as demo-only, and missing evidence as the disconnected real AI and news backend. It helps the user see why the current framework is incomplete.

Planning Reference keeps first/second interest areas, invalidation and target/observation area. Nearby helper text says **Planning reference only**, **Not a buy/sell instruction**, **Consider waiting for confirmation**, and **Use with your own risk control**. Values remain generic descriptions and contain no calculated prices.

Related-news wording now says **Related demo news considered** and **Demo news only — real news analysis is not active yet**. It uses only the existing explicitly mapped mock headlines and never claims an AI processed real news. Existing empty and loading states remain, and invalid instrument data now degrades to an analysis-unavailable message instead of throwing.

## Language, trust and scope

English and Korean cover Scenario Map, Evidence Check, evidence fields, missing evidence, status badges, planning helpers, improved empty/unavailable states and demo-news boundaries. Symbols, exchanges and company names remain untranslated.

The panel keeps **Mock scenario**, **AI inactive**, **Possible paths, not a prediction**, **Not investment advice**, and **User makes the final decision** close to decision-support content. Real AI, actual probability or price calculation, backtesting, portfolio-aware analysis, news proxy, real-news summarization, Paid Sector Picks, trading, accounts and database remain deferred.

## Roadmap note

`docs/roadmap.md` now records 9.2 News Backend Proxy design, 9.3 Local News Proxy prototype, and 9.5 Paid Sector Picks UI foundation. Paid Sector Picks is documented only as a future evidence-based paid view of roughly three watchlist/interest candidates per sector, dependent on news/backend foundations. No subscription or sector-pick feature was implemented.
