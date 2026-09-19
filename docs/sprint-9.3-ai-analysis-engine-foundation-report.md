# Sprint 9.3 — AI Analysis Engine Foundation

## Scope

Sprint 9.3 establishes the internal contract for the evidence Market Copilot may eventually provide to a reviewed AI model. It does not connect a real model, execute a prompt, call an external service, or produce an investment recommendation.

## AI analysis input model

`AiAnalysisInput` groups six explicit boundaries:

- Instrument identity: internal ID, symbol, display name, market, localized market label, and crypto/stock asset type.
- Quote evidence: price, 24-hour change, volume, and an available/missing state.
- Market context: market type, LIVE/MOCK mode, observed connection state, and safe session status.
- News context: provider mode, observed status, bounded related demo headlines, demo provenance, and real-news availability.
- Scenario context: mock bias, null confidence, timeframe, Scenario Map, and evidence state.
- Missing inputs: real AI, real news backend, backtesting, portfolio context, and a real probability model.

The package carries a generated timestamp but contains no hidden chain-of-thought, private reasoning trace, prompt, key, credential, or model token data.

## Context builder

`buildAiAnalysisContext` is a synchronous pure boundary over existing app data. It performs no fetch. It returns an explicit unavailable result when the instrument is absent, converts non-finite quote values to missing evidence, retains demo-news provenance, and marks unavailable infrastructure rather than throwing. It does not infer a stock session state or invent a real provider result.

## Deterministic mock engine

`createMockAiAnalysis` transforms one input package into one stable `AiAnalysisResult`. The same input and language produce the same result. Output includes a user-facing summary, watch reason, evidence list, missing evidence, risk and invalidation summaries, next watch points, Scenario Map links, and a safety disclaimer.

Crypto copy refers only to generic volatility, BTC-led movement, exchange activity, and short-term confirmation. Stock copy refers only to generic sector/theme, index mood, company/news context, and volume confirmation. These are framework placeholders, not claims about current conditions.

## AI Copilot integration

The existing Scenario Map, scenario cards, Evidence Check, Planning Reference, and related demo news remain intact. The new compact **AI Analysis Foundation** section displays:

- Mock analysis / Real AI inactive status.
- The future-model boundary message.
- Watch reason, evidence used, missing evidence, risk summary, and next watch points.
- A collapsible **Analysis Input Package** showing price, news, scenario, AI model, news backend, and portfolio-context availability.
- “Not investment advice” and “User makes final decision” safeguards.

The scenario UI and foundation share the same generated mock Scenario Analysis object so the evidence package does not silently diverge from the visible Scenario Map.

## Evidence and missing-data behavior

Evidence items have explicit `available`, `demo`, `placeholder`, or `missing` states. Current related news is sourced only from the existing deterministic dashboard mock set and remains labeled demo-only. Real AI, real news backend, backtesting, portfolio context, and real probability modeling remain missing. Incomplete inputs lead to an `incomplete-evidence` result instead of a fabricated score.

## Language coverage

Every new user-visible label and framework sentence has English and Korean copy. Symbols, exchange names, and company names remain untranslated. Tests exercise both language paths through the application shell.

## Tests

- Crypto input construction and LIVE context.
- Real AI and real news backend missing flags.
- Missing/non-finite quote handling.
- No-instrument unavailable context.
- Deterministic mock results.
- Explicit proof that the mock engine does not call `fetch`.
- Crypto/stock wording boundaries and prohibited recommendation wording.
- AI Copilot foundation, evidence, input package, missing data, and English/Korean rendering.
- Existing no-instrument application empty state remains covered.

## Deferred

- Real AI model connection, model selection, prompt execution, streaming, token/cost tracking, and actual probability scoring.
- Real news backend, Local News Proxy, real news summarization, and News + AI evidence integration.
- Paid Sector Picks and any paid-access system.
- Entry/target calculation, backtesting, portfolio-aware analysis, trading, and order execution.
- Authentication, user accounts, backend services, and database storage.

Roadmap order is now 9.3 AI Analysis Engine Foundation, 9.4 Local News Proxy Prototype, 9.5 News + AI Evidence Connection, and 9.6 Paid Sector Picks UI Foundation.
