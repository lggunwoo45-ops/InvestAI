# Sprint 9.5 — News + AI Evidence Connection

## Delivered

Sprint 9.5 connects the normalized result already loaded by `NewsService` to the AI Analysis Input Package. News Center, Market Briefing, and AI Copilot now consume one shared provider result, so the AI evidence view does not issue a second request or depend on the visible News Center filters.

No real AI interpretation, prompt execution, recommendation, causality claim, production backend, or source-ranking logic was added.

## News evidence model

`AiAnalysisInput.newsContext` now records:

- Requested provider mode and observed provider state.
- Displayed source: Mock, Browser RSS, Local Proxy, or none.
- Demo versus real-news provenance.
- Whether Local Proxy transport supplied the articles.
- Explicit instrument-related count and up to three related headlines.
- Up to three unlinked macro/market-level headlines.
- Evidence label: Demo news, Demo fallback, Browser RSS, Local Proxy RSS, or no evidence.
- Evidence scope: instrument-specific, market-level, demo-only, or none.

The Analysis Input Package still marks the production news backend missing even when the localhost prototype is available.

## Scope classification

`newsForInstrument` remains the explicit instrument relation boundary. A verified internal instrument ID or an existing related-symbol mapping may produce instrument-specific evidence. Without that mapping, an article cannot become instrument-specific merely because its words resemble an asset name.

Unlinked articles whose `relatedMarkets` contains `macro` become market-level evidence. Federal Reserve Local Proxy articles normally have no related symbols and therefore remain market-level macro context for both stocks and crypto. The UI and mock engine explicitly state that this is not coin-specific or company-specific coverage.

Mock and fallback articles remain demo-only even when they contain an illustrative related symbol. If the provider has no articles, the evidence scope is none.

## Deterministic mock engine

The mock engine adds a user-facing `newsEvidenceSummary` selected only from structured provenance and scope. It distinguishes Local Proxy RSS, Browser RSS, demo placeholders, and no evidence. It never reads a headline to infer direction, causality, confidence, probability, or a recommendation.

## AI Copilot UI

The compact **News Evidence** section shows:

- Evidence source and scope.
- Up to three considered headlines.
- The deterministic provenance summary.
- Trust labels explaining that real AI interpretation is disconnected, Local Proxy RSS is experimental transport rather than AI analysis, and the production backend remains disconnected.

The existing AI Analysis Foundation, Scenario Map, Evidence Check, Planning Reference, and related demo-news section remain present.

## Analysis Input Package

The expandable package now distinguishes:

- News data: Demo only, Browser RSS, Local Proxy RSS, or none.
- News scope: instrument-specific, market-level, demo-only, or none.
- News backend: local proxy prototype where applicable, while always preserving the production-backend-missing label.
- AI model: not connected.

## News Center independence

The provider result is loaded once in `NewsProviderModeProvider`. News Center filtering derives a view from that result and never mutates it. AI Copilot therefore continues to see available provider evidence when a category, search, or market filter hides all cards.

## Long RSS headline readability

News cards now expose whether a thumbnail exists. Cards without a thumbnail use a full-width content column with a practical minimum width, and headlines use natural word wrapping instead of `overflow-wrap: anywhere`. Existing thumbnail-based mock cards retain their two-column layout.

## Language coverage

All source, scope, headline, transport, missing-backend, and trust labels have English and Korean strings. Symbols, exchange names, company names, and Federal Reserve Board remain untranslated.

## Automated coverage

- Local Proxy RSS is real evidence but not production-backend evidence.
- Unlinked macro RSS is market-level and never instrument-specific.
- Mock/fallback provenance remains demo-only.
- The deterministic engine describes Local Proxy evidence without causal or recommendation wording.
- AI Copilot renders Mock and Local Proxy evidence, scope, headlines, input-package state, and trust labels.
- Long no-thumbnail RSS headlines use the full-width card structure.
- Existing Mock, Browser RSS, Local Proxy, filters, proxy security, and application tests remain active.

All tests use local fixtures or mocked fetch results. They do not contact real RSS or any AI service.

## Deferred

- Real AI connection, prompt execution, streaming, token/cost tracking, summarization, and actual probability scoring.
- Production news backend, hosted proxy, source expansion, licensing approval, ranking, and advanced relevance.
- Paid Sector Picks, entry/target calculation, backtesting, and portfolio-aware analysis.
- Trading/order execution, accounts, authentication, database, payments, and subscriptions.
