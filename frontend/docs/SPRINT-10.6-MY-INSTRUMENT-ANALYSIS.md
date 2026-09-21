# Sprint 10.6 — My Instrument Analysis Foundation

## Scope

This sprint adds a personal, instrument-first research workspace at `/my-analysis`. It reuses existing market catalogs, deterministic candidate engines, and normalized news state. It does not connect a real AI model, execute trades, persist personal notes, or fabricate stock fundamentals.

## Architecture

- `types/myAnalysis.ts` defines stable inputs, evidence, quality, and result contracts.
- `services/myAnalysis/myAnalysisEngine.ts` is a pure deterministic boundary. It receives data and returns both Simple and Expert presentations without network access.
- `pages/MyAnalysis/` owns search, selection, intent and optional personal context.
- Existing catalog and news providers remain the only data-access layer.

## Trust boundary

- Crypto public-market fields can be labeled live only when the catalog source is live.
- Stock catalog movement remains mock/demo context and is never promoted to investment evidence.
- Filings, verified earnings, fundamentals, and analyst ratings remain visibly missing until approved providers exist.
- Personal notes and average price are user-provided context only. No portfolio or gain/loss conclusion is calculated.
- No AI prediction, recommendation, probability, target, or automated action is produced.

## Future extension points

1. Add approved real stock providers behind the existing catalog boundary.
2. Add normalized filings, earnings, fundamentals, and analyst-data adapters.
3. Persist user inputs only after authentication, encryption, permission, and audit requirements are designed.
4. Feed the typed evidence package to a governed AI provider while retaining source attribution and missing-evidence checks.
5. Add an explicit Market-detail shortcut once product placement is finalized; direct links already support `?instrumentId=`.
