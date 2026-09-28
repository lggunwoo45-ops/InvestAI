# Sprint 10.21 — Bitcoin Market Anchor and Candidate Quality Gate

## What changed

Sprint 10.21 adds a separate Bitcoin market context above the Upbit and Binance daily candidate workspaces and introduces a deterministic quality gate before candidates are saved or displayed. The gate reuses existing Practical Decision, Candidate Review Score, data-quality, freshness, and evidence outputs. It does not introduce a new investment score or change the existing candidate ranking engine.

## Why the Bitcoin anchor was added

Crypto candidates are easier to review when the broader BTC flow is visible first. Upbit uses BTC/KRW and Binance prefers BTC/USDT spot, with futures as an availability fallback. The anchor is context only, remains separate from the five candidate slots, does not reorder candidates, and cannot trigger an automatic refresh.

## Candidate quality gate

The gate excludes an item when its current price is invalid, Practical Decision is unavailable, Candidate Review Score is unavailable or below 60, data quality is unavailable, or the current snapshot basis cannot be compared. Passing items retain their original order.

The gate does not read average price, personal notes, future performance, account data, or portfolio data. Expanded-movement caution remains part of the existing review score cap; it is not treated as a directional signal.

## Why fewer than five candidates may appear

The daily snapshot now records up to five passing candidates rather than filling five slots unconditionally. If fewer candidates pass, the UI explains that only candidates meeting the current review basis are shown. An intentionally empty daily result is valid and persists as a zero-item snapshot, so the product does not silently substitute weaker candidates.

## Market bucket summary

Every bucket shows displayed and excluded counts, a neutral shortage label when fewer than five are displayed, and grouped exclusion reasons. The wording describes missing or insufficient review basis without labelling instruments as bad.

## Volume-only bias mitigation

The existing candidate engine order remains intact, but high activity or movement alone can no longer guarantee display. A candidate must also pass current-price, data-quality, Practical Decision, evidence-based review-score, and snapshot-basis checks. This reduces volume-only selection bias without replacing the candidate engine or adding prediction logic.

## UI integration

- Upbit and Binance: bucket selector → Bitcoin market anchor → market bucket summary → fixed daily snapshot list.
- KOSPI, KOSDAQ, and US stocks: bucket selector → market bucket summary → fixed daily snapshot list.
- My Analysis adds a small BTC-context note only when a crypto instrument is opened from a daily bucket record.
- Existing manual refresh, saved order, Practical Decision, Review Ranges, Candidate Review Score, and My Analysis handoff remain available.

## Safety wording

The anchor is explicitly labelled as market context, not a trade instruction. No transaction direction, order-price, future-price, return-probability, or performance-prediction output was added.

## Tests added or updated

- BTC/KRW and BTC/USDT anchor selection, spot preference, mock limitation, and unavailable states.
- Anchor card bilingual and safe-state rendering.
- Quality-gate threshold, unavailable-state, invalid-price, order-preservation, and personal-input boundaries.
- Market summary bilingual counts, shortage, neutral zero state, and exclusion reasons.
- BTC candidate-slot separation.
- Empty daily snapshot build and persistence.
- `/ai-analysis` anchor visibility by bucket, one-list behavior, filtered legacy records, and selected-bucket refresh isolation.
- My Analysis crypto daily-snapshot context wording.

All automated tests use deterministic local fixtures or mocks. They do not call real DART, RSS, AI, account, payment, or backend services.

## Deferred

- True BTC dominance or index data
- Market-regime modelling
- Real technical indicators
- Real AI
- Real stock providers
- Backend, authentication, payment, and database
- Trading and order execution
- Personalized portfolio candidate filtering
