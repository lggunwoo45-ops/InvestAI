# Sprint 10.29 — Market Workspace Layout and Final Read Evidence Transparency

## Outcome

Sprint 10.29 improves how the existing Market workspace and deterministic AI Copilot conclusion are read. It does not add a provider, model, prediction, recommendation, order workflow, or new investment rule.

## Market workspace layout

- Crypto, Korea Stocks, and US Stocks now use one workspace-level asset selector above both the explorer and selected-instrument detail layouts.
- Changing the asset group continues to use the existing venue transition and per-asset instrument restoration logic. It does not reload the application.
- Repeated descriptive copy beneath the three asset headings was removed. Provider, venue, quote, data mode, result count, and beta-data boundaries remain visible where they are operationally relevant.
- The instrument column now targets a wider desktop range (`380–460px`) and scales down at the existing compact breakpoints. Ultra-wide layouts retain a stable `460px` list.
- Hide/Show instruments, its persisted preference, the selected chart, technical overlays, and trading-information layout remain unchanged.

## Final Read evidence transparency

- Final Read still uses the Sprint 10.28 deterministic state rules. No conclusion thresholds or candidate calculations were replaced.
- The card now explicitly labels why the state was produced and separates the conclusion, key reason, next check, evidence, and always-visible safety caution.
- Available evidence is normalized into typed items with a factor label, observed value, and neutral display state such as Constructive, Neutral, Caution, Limited, Strong, Weak, or Check needed.
- Unavailable optional evidence is omitted rather than rendered as if it had been observed. Data quality remains visible because it is an explicit part of every analysis boundary.
- The first four evidence items stay compact by default. An accessible Show/Hide evidence details control reveals the complete available evidence and source-factor trace.
- English and Korean copied summaries use the same evidence items and preserve the decision-support/not-a-trade-instruction caution.

## Safety and compatibility

- No buy, sell, entry, stop-loss, take-profit, or target-price instruction was introduced.
- No real AI model, trading, broker, authentication, payment, database, backend, or new network provider was added.
- Market asset switching, search, sorting, virtualization, favorites, remembered selections, list collapse, chart mode, overlays, and AI Copilot selected-instrument synchronization are preserved.
- Tests use deterministic mocked or rejected network paths; they do not call a real market, news, DART, or AI endpoint.

## Test coverage added or updated

- Workspace-level asset selector is present once and remains available in selected-instrument detail mode.
- Repetitive English and Korean asset descriptions are absent.
- Crypto, Korea, and US switching continues to select the safe existing default and keeps the chart active.
- Final Read compact evidence, disclosure behavior, source trace, safety caution, and bilingual labels are covered.
- Missing optional evidence is omitted; available evidence receives an explicit neutral state label.
- Different selected instruments produce different states/reasons and update the detailed source trace.

## Remaining boundaries

- The evidence states describe current deterministic inputs; they are not confidence probabilities or outcome forecasts.
- Mock stock data remains mock data, and live-data/provider availability continues to be shown by existing product boundaries.
- The Market workspace is optimized for the current desktop terminal shell. Smaller-width support remains a compact desktop adaptation rather than a mobile trading experience.
- Visual verification is limited to component and integration rendering in this sprint because browser automation and executable launch are outside the authorized workflow.
