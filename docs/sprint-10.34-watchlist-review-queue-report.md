# Sprint 10.34 — Watchlist and Review Queue

Implementation written; validation and local commit pending. No validation success is claimed by this report until the finish script completes.

## Changes and storage

The existing shared WatchlistProvider is extended, rather than adding a duplicate favorite system. Market stars, selected AI Copilot actions and dashboard membership share the same instrument IDs. The existing named lists keep their legacy key; instrument metadata, timestamps and reviewed snapshots are persisted locally under `market-copilot.watchlist.v1`. Existing favorite membership is adapted to metadata when available from the local instrument registry; review-key membership is restored into existing default lists. Existing default sample favorites are preserved.

The hook exposes watchlistItems, isWatchlisted, addToWatchlist, removeFromWatchlist, toggleWatchlist, markReviewed and getWatchlistItem. The existing two-argument named-list removal API remains compatible; one-argument removal removes an instrument from all lists. Runtime AppProviders and the Sprint 10.33 test helper already mount this provider, so no duplicate provider was added.

Storage uses explicit field allowlists for items and snapshots, finite numbers and valid timestamps. Invalid JSON, invalid structures or unknown Final Read states return an empty review list safely. Unknown credential/key fields are excluded on write. Blocked or full storage leaves session state usable. No network calls are made by storage or queue calculations.

## Market and review queue

The compact All / Watchlist / Review queue scope replaces the old favorite-only control. Counts describe saved instruments in the loaded venue, independently of search. Saved scope includes all quote assets in that venue; the normal All scope retains its quote filter. Loaded rows preserve the existing selection path to chart, detail and AI Copilot. Saved venue identities absent from the catalog show their name and limited-data review reasons without an invented quote or analysis; they can be removed, but cannot open a chart until available from a catalog. Other venues remain accessible by switching asset/provider/venue.

Reasons are deterministic and localized:

- No reviewed snapshot: 처음 확인 필요.
- Different current and reviewed Final Read state: 판단 변화 확인 필요.
- Attention-worthy states: 접근 검토 상태, 변화 확인 필요, 보유 기준 재확인, 움직임 확대 확인 필요.
- Previously insufficient data becoming usable: 데이터 확인 가능.
- Absolute 24h movement at least 5% for crypto or 3% for stocks: 가격 변동 확대.
- Review older than 24 hours: 마지막 확인 후 시간 경과.
- Missing or insufficient current analysis: 데이터 확인 필요.

The queue uses current loaded row movement and the selected AI Copilot's available Final Read. It never computes a replacement Final Read for other rows or treats the reviewed snapshot as current analysis. A minute timer refreshes time-based reasons while mounted; there is no background monitor or notification.

## Confirm reviewed and AI Copilot

A compact selected-instrument control shows membership, a star, Mark reviewed / 확인 완료, and the saved review timestamp. Confirmation captures the actual current Final Read state/title/summary, available price/movement, data availability and current timestamp. Optional score and contextual snapshot fields are supported by storage but omitted when not supplied by the existing card output.

Confirmation updates lastReviewedAt and updatedAt, preserves membership, and removes first-review/changed/stale reasons when applicable. Attention-worthy states, large price movement or limited data can keep an item in the queue. Unavailable Final Read can be confirmed with a limited snapshot. Confirmation adds no network requests and does not change Final Read, candidate score, market provider, DART or News calculations.

My Analysis and copied summaries are unchanged; the optional extension was deferred to keep this workflow compact.

## Tests and validation

Added storage tests cover empty/malformed data, add/remove/toggle/deduplication, persistence, reviewed timestamps and secret-field exclusion. Queue tests cover first review, changed/attention states, improved/limited data, inclusive positive/negative movement thresholds, the 24-hour boundary and confirmation clearing. Provider/UI workflow tests use renderWithProviders for stars, scopes/counts, empty states, selection, confirmation, limited snapshots, remount persistence and provider API behavior. The existing AiCopilot evidence test now confirms that the stored state matches the displayed Final Read and confirmation leaves that state unchanged. Existing App and layout tests have updated star-label expectations; their chart, hide/show and asset-switch coverage is retained.

New service tests use no external APIs. Workflow tests use fixture market rows and the shared static mock news context. Confirmation test asserts fetch is not called. Existing AiCopilot tests mock news and related components. Review reason dictionaries and new action UI are checked for prohibited guidance. Manual browser testing is not performed because browser automation is prohibited.

Requested validation and conditional local commit:

```powershell
.\scripts\finish-sprint.ps1 -Message "Sprint 10.34: add watchlist review queue"
```

The script runs proxy tests, lint, typecheck, unit tests with one worker, build and diff checks, then commits only if all pass. Permission errors must stop work immediately and leave changes uncommitted.

## Limitations and deferred work

Review counts are per venue, not an aggregate across every asset group. Full current Final Read is only available for the selected instrument while AI Copilot is mounted. Switching away may yield a limited-data reason on an earlier item. Missing catalog identities are shown as limited and cannot be charted from stored metadata alone. Storage is browser-local without cross-tab conflict resolution or account sync. The legacy favorites key and review key are separate nontransactional localStorage writes.

Deferred: cloud sync, login/account watchlists, push/mobile notifications, real-time background monitoring, generative commentary, personalized portfolio advice, trade signal services, broker/trading integration, backend, authentication, payments and databases. No direct trading or order-price guidance is added.
