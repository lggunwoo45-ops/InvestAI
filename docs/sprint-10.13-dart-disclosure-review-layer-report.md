# Sprint 10.13 — DART Disclosure Review Layer

## What was added

Sprint 10.13 adds a deterministic review model and a bilingual beginner-facing review card above the existing DART source list. It explains which neutral disclosure types were loaded and what original source material should be checked. It does not summarize disclosure documents, infer impact, or produce an investment action.

## Review model behavior

`buildDartDisclosureReview` converts the typed DART transport result into one of six UI states: `no_data`, `disabled`, `mapping_unavailable`, `no_recent_disclosures`, `review_available`, or `review_needed`. It counts periodic, material, correction, and other disclosures and records the most recent submission date. A correction or material item produces `review_needed`; that status means only that the original source needs review and carries no favorable or unfavorable interpretation.

## Review card and source panel

The Disclosure Review card is the explanation layer. It shows a neutral headline, disclosure-type counts, up to three review points, and safety wording. The existing Recent DART Disclosures panel remains the source list and continues to show titles, dates, categories, and safe original-viewer links. Disabled, missing-mapping, and empty states now explain that the application remains usable even when disclosure evidence cannot be shown.

## Korean-stock-only integration

Both DART components render only when the selected instrument belongs to `korea-stock`. In Simple Mode, the review card appears after the selected interest/position review and before Action Readiness; the compact source list remains below it. In Expert Mode, the review card appears immediately before the full DART source list. Crypto and US stock analysis do not receive DART UI or copy-summary lines.

## Report and copy summary

For a Korean stock with loaded disclosures, the Report Summary adds one small source-review line. The plain-text copy uses a generic evidence line for `review_available` and a correction/material source-check line for `review_needed`. It continues to exclude personal notes. Disabled, unavailable, and missing-mapping states do not add disclosure copy.

## Independence from Action Readiness

DART results are converted outside `myAnalysisEngine` and are passed only to the report and presentation components. The engine input and output contracts are unchanged. Action Readiness, Beginner Interest Zone, Position Review, and their calculations therefore cannot change based on DART availability or content.

Adding a DART item directly to the existing engine evidence array is deferred. That array participates in report counts and analysis construction, so keeping DART in its dedicated source-review layer provides the clearer non-influence boundary for this sprint.

## Language and safety coverage

English and Korean copy covers review states, type counts, review points, original-source guidance, disabled/mapping/empty explanations, report lines, and safety notices. Tests reject directional, transaction, future-price, and disclosure-impact wording. The layer does not use favorable/unfavorable badges or aggressive color semantics.

## Tests

Tests cover every safe empty state, category counts, review-needed and review-available rules, bilingual wording, card rendering, Korean-stock-only page visibility, report-copy behavior, and continued source-panel behavior. All DART data is injected through fixtures; tests do not contact OpenDART, RSS, an AI service, or a backend.

## Deferred

- Full disclosure-document parsing and AI summarization
- Favorable/unfavorable or price-impact interpretation
- Action-status changes based on disclosure contents
- Full corporation-code synchronization and a real stock-price provider
- Real AI and direct transaction signals
- Future order, stop-loss, take-profit, or percentage-ladder values
- Portfolio storage, backend synchronization, accounts, payments, order execution, and regulated advisory workflows
