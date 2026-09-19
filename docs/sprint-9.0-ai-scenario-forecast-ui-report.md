# Sprint 9.0 — AI Scenario / Forecast UI Foundation

## What was added

The AI Copilot now presents a structured **AI Forecast / Scenario Analysis** foundation for the active instrument. With no active instrument it explicitly asks the user to select one. With an active instrument it keeps the existing symbol, market, price, change, chart-timeframe context and adds three possible-path cards, rationale, watch conditions, risks, a planning-reference section, related demo news and trust labels.

This sprint is UI and deterministic mock-data structure only. It makes no model/API call, prediction, recommendation, probability calculation, entry/target calculation or trade. Confidence is shown as `—` and every scenario probability says that it is a placeholder. Market bias is `mixed`, not inferred from price movement.

## Scenario model

`AiScenarioAnalysis` is the future provider boundary. It contains:

- stable `instrumentId`, mock `generatedAt`, provider mode, nullable confidence, market bias and short/medium/long timeframe;
- bullish, neutral and bearish `AiScenarioItem` records with nullable probability, summary, supporting conditions, invalidation text and risks;
- rationale, watch conditions and risk factors;
- trade-planning reference fields for first/second interest areas, invalidation condition and target area;
- a required disclaimer.

Provider modes are `mock`, `real-ai-disabled`, and `future-ai`. Sprint 9.0 always returns `mock`. The selected chart interval maps only to a presentation timeframe: 1D → long, 4H → medium, and shorter intervals → short.

## Mock behavior and wording

`createMockScenarioAnalysis` returns generic localized examples by instrument category:

- Crypto mentions volatility, volume, BTC market influence, exchange activity and short-term momentum.
- Stocks mention sector/theme context, company movement, market-board/index mood and explicitly unverified earnings/news placeholders.

It does not use the selected instrument's live price or fabricate company facts. The planning section says “interest area,” “invalidation condition,” and “target area,” never “buy now,” “sell,” or a recommended price. Example content describes what a user might watch, not a guaranteed outcome.

Existing explicitly mapped mock news remains in the related-news section, limited to three headlines. The UI says **Related demo news considered** but does not claim that an AI processed or summarized it. With no mapped news it retains the existing clear empty state.

## UI components and trust boundary

- `AiForecastPanel` assembles the forecast summary, rationale, possible paths, watch/risk sections and planning reference.
- `ScenarioCard` renders each possible path equally with support, invalidation and risk context.
- `TradePlanningReference` keeps planning language and its disclaimer next to decision-support fields.
- The AI Copilot retains the existing market facts and related-news connection.

Trust labels remain close to the content: **Mock scenario**, **AI analysis is not active yet**, **Not investment advice**, **You make the final decision**, **Possible paths, not a prediction**, and **Planning reference only**. No scenario receives a dominant probability or visual guarantee.

English and Korean cover the forecast, scenario, confidence placeholder, bias, rationale, support conditions, risks, planning fields, empty state and safety labels. Symbols, exchanges and company names are not translated.

## Validation and deferred work

Tests cover the complete model shape, nullable confidence/probabilities, crypto and stock-specific mock context, price-free planning wording, Korean copy, empty state and rendered scenario/planning UI. Existing application tests continue to cover market selection, chart/timeframe synchronization, news and workspace behavior.

Deferred: real AI provider/model calls, actual probability scoring, actual entry/target calculation, backtesting, portfolio-aware analysis, news backend proxy, real-news AI summarization, trading/order execution, user accounts, authentication and database.

The local branch starts from the same file tree as the PR #12 merge commit. `git fetch` was unavailable, so its commit ancestry must be synchronized with current `origin/main` before a future PR.
