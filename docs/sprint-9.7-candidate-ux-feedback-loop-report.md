# Sprint 9.7 — Candidate UX Polish + Local Feedback Loop

## Outcome

Crypto Watch Candidates is now a daily review workspace. Every candidate keeps its rank, transparent Watch Score, reason, top evidence, risk condition, news provenance, and Market navigation while adding a separate human review layer.

## Review status

Each instrument can be `unreviewed`, `watching`, `reviewed`, or `dismissed`. The current status is visible on its card and can be changed or reset explicitly. Dismissed candidates remain visible in the All view with subdued styling; selecting the Dismissed filter isolates them. Status does not change ranking or scoring.

## Device-only feedback

Status and a note of at most 300 characters are stored under `market-copilot.cryptoCandidateFeedback.v1`. The payload has a schema version and runtime validation. Malformed JSON, invalid shapes, unknown status values, invalid timestamps, and oversized notes cause safe removal and an empty fallback. There is no request, account, analytics, telemetry, cloud sync, or backend path in this feature.

The reset action asks for confirmation and then removes every candidate status and note. Resetting one status keeps that candidate's note so the two user decisions remain independent.

## Summary and filtering

The top summary reports total candidates, counts for all four review statuses, market data mode, news source, and that real AI is not active. Filters show All, Unreviewed, Watching, Reviewed, and Dismissed. Filtering affects presentation only; the deterministic candidate engine receives no feedback state.

## Checklist and Market flow

Evidence details include visual prompts to confirm volume, BTC direction, news source, invalidation conditions, and the chart. They are human review prompts, not assurances. “Open in Market” preserves its prior behavior and never changes status. A separate “Mark reviewed after opening” action is available when the user wants both actions explicitly.

## Language and trust boundary

English and Korean cover summary, status, actions, filters, local note disclosure, reset, empty states, checklist, data mode, news source, and the real-AI inactive label. Symbols and provider identities remain unchanged. The UI continues to describe evidence and risk without presenting an outcome, trade instruction, or model recommendation.

## Deferred

Real AI, actual AI recommendations, Paid Sector Picks, sector daily candidates, production news backend, news ranking, portfolio-aware analysis, backtesting, probability models, entry or target calculations, order execution, accounts, databases, payments, subscriptions, cloud sync, and telemetry remain outside Sprint 9.7.
