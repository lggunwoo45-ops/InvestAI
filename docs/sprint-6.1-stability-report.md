# Sprint 6.1 stability report

## Executive result

Sprint 6.1 resolves the blocking stability findings on Sprint 6 PR #4 without adding product scope. Trading, AI, authentication, backend, database, and Sprint 7 work remain excluded.

## Fixes

- Added strict runtime validation for versioned watchlist and recently-viewed Local Storage payloads.
- Invalid JSON or valid JSON with an invalid schema is removed and safely replaced by defaults.
- Added custom watchlist deletion, case-insensitive duplicate-name protection, and an eight-list custom limit.
- Preserved orphaned instrument IDs as visible `Unavailable` rows with a removal action.
- Hardened drag and drop with an InvestAI-only data marker plus cancelled-drag cleanup.
- Cleared the active market connection state when the Market detail hook unmounts.
- Changed the Windows demo origin to stable port `18460`, with `18461`-`18463` as bounded fallbacks.
- Isolated launcher clients on the ThreadPool, applied five-second send/receive timeouts, and contained closed or malformed connection failures to the affected client.
- Added `release/` to the frontend Git ignore rules.

## Test coverage

- Corrupted storage recovery for object, string, number, incomplete array, and malformed recently-viewed data.
- Valid schema load and persistence roundtrip.
- Custom watchlist creation, duplicate prevention, count limit, deletion, and default-list protection.
- Favorite add/remove behavior.
- Cancelled internal drag and external drag rejection.
- Unavailable instrument visibility and removal.
- Header market-status cleanup after navigation away from Market.

## Verification

- Lint: passed with zero warnings.
- TypeScript: passed.
- Tests: 7 files, 27 tests passed.
- Production build: passed; 145 modules transformed.
- Windows demo build: passed.
- Direct EXE: stable port 18460, concurrent request HTTP 200, eight refresh requests HTTP 200, process remained alive.
- EXE restart: a watchlist created through the UI survived restart on the stable origin.
- Portable ZIP: extracted EXE returned HTTP 200, retained the same watchlist, and remained alive.

## Merge readiness

The stability fixes are scoped to PR #4 and do not alter Sprint 5 provider, chart, WebSocket, orderbook, trade, or LIVE/MOCK behavior. The branch is ready for another review after CI completes. The PR must remain unmerged until approved.
