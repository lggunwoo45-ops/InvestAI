# Sprint 10.6 — My Instrument Analysis Foundation

## Scope

This sprint adds a personal, instrument-first research workspace at `/my-analysis`. It reuses every existing Market Explorer catalog, deterministic candidate engines, and normalized news state. It does not connect a real AI model, execute trades, persist personal notes, or fabricate stock fundamentals.

## Architecture

- `types/myAnalysis.ts` defines stable inputs, typed evidence, quality, user context, and result contracts.
- `services/myAnalysis/myAnalysisEngine.ts` is a pure deterministic boundary. It receives data and returns Simple and Expert presentations without network access.
- `pages/MyAnalysis/` owns search, selection, review intent, and optional personal context.
- Existing catalog and news providers remain the only data-access layer.
- Market detail links use `?instrumentId=`; all nine existing Explorer venues are resolved by the analysis page.

## Pre-merge review fixes

- Third-party headlines cannot enter Simple Mode app-authored guidance arrays. News evidence contains only an attributed provider availability statement.
- Mock crypto and mock stock data are both labeled `Mock / demo data`; their price, movement, and volume evidence carries a visible `Demo` level.
- Expert Mode renders typed evidence directly, including level and source labels.
- Notes, average price, and intent are isolated under `Your inputs` and explicitly marked as non-market evidence.
- Intent changes checklist wording only and cannot create personal advice.
- Simple Mode includes the actual 24-hour movement and a deterministic large-move caution.

## Trust boundary

- Crypto public-market fields can be labeled live only when the catalog source is live.
- Stock catalog movement remains mock/demo context and is never promoted to investment evidence.
- Filings, verified earnings, fundamentals, and analyst ratings remain visibly missing until approved providers exist.
- Personal notes and average price are user-provided context only. No portfolio, gain/loss, stop, target, or position conclusion is calculated.
- No AI prediction, recommendation, probability, target, or automated action is produced.

## Future extension points

1. Add approved real stock providers behind the existing catalog boundary.
2. Add normalized filings, earnings, fundamentals, and analyst-data adapters.
3. Persist user inputs only after authentication, encryption, permission, and audit requirements are designed.
4. Feed the typed evidence package to a governed AI provider while retaining source attribution and missing-evidence checks.
