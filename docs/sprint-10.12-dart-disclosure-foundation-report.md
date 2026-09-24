# Sprint 10.12 — DART Disclosure Foundation

## What was added

Sprint 10.12 adds an optional localhost OpenDART transport, a typed browser client, neutral title classification, a deliberately small verified corporation-code mapping, and a bilingual Recent DART disclosures panel for Korean stock analysis. DART remains source evidence only and does not affect Action Readiness, interest stages, or position review.

## DART proxy behavior

`npm run dart:proxy` starts a separate Node server on `localhost:8788`. Its only data route is `GET /api/dart/disclosures`, accepting `stockCode` and `corpCode`. The handler rejects other methods and arbitrary parameters, requests only the fixed OpenDART JSON list endpoint, caps response size, applies a timeout, normalizes at most ten entries, and returns safe structured failure states. It never scrapes pages or downloads disclosure documents.

`npm run test:proxy` now runs both the existing news proxy suite and the new DART proxy suite. All upstream calls are injected fixtures; the suite does not contact OpenDART.

## API-key handling

The Node proxy reads `process.env.DART_API_KEY`. The key is sent only to the fixed upstream API as `crtfc_key`; it is never returned, printed, placed in a `VITE_` variable, or referenced by browser code. `.env` variants are ignored while `.env.example` documents only an empty variable name.

PowerShell startup example:

```powershell
$env:DART_API_KEY="your_key_here"
npm run dart:proxy
```

Without the key, the proxy returns `disabled` with an empty disclosure list.

## Corporation-code mapping

`dartCorpCodeMap.ts` maps only `005930` to `00126380`, the verified Samsung Electronics example supplied in the approved sprint request. Unknown stock codes return `null` and the client surfaces `mapping_unavailable` without a network request. Full `corpCode.xml` ZIP synchronization is deferred.

## Disclosure panel

The panel shows at most five recent report titles, submission dates, neutral Periodic/Material/Correction/Other labels, and an OpenDART viewer link derived from a validated receipt number. Compact Simple Mode shows at most two. Disabled, mapping-missing, loading, empty, and unavailable states remain usable without mock substitution. Fixture disclosures are test-only and explicitly marked mock.

## My Analysis integration

The hook runs only for Korean stock selections. Simple Mode places a compact panel after Action Readiness. Expert Mode places the full panel between available evidence and missing evidence. Crypto and US instruments do not render it. The existing analysis engine is unchanged, so disclosure availability cannot alter a status or stage in this sprint.

## Korean, English, and safety wording

Both languages cover panel headings, report metadata, category labels, disabled/mapping/unavailable messages, evidence-only context, and the safety notice. The classifier only labels source document type; it does not infer favorable/unfavorable impact, score importance, summarize content, or produce a transaction recommendation.

## Tests

Tests cover proxy disabled/mapping/success/failure behavior, key non-exposure, classifier categories, client validation, zero-network missing mapping, bilingual panel states/list rendering, Korean-stock-only page integration, and existing My Analysis behavior.

## Deferred

- Full corporation-code ZIP synchronization
- Full document download, parsing, or deep disclosure analysis
- AI disclosure summarization or favorable/unfavorable interpretation
- Status changes based on disclosure content
- Real stock price providers and real AI
- Future order prices, stop/take-profit levels, and percentage zone ladders
- Earnings, fundamentals, portfolio storage, backend sync, accounts, payments, trading, and regulated advisory workflows
