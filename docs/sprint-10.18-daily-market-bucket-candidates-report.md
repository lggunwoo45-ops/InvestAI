# Sprint 10.18 — Daily Market Bucket Interest Candidates

## Outcome

AI Analysis now leads with one daily market-bucket workflow instead of asking beginner users to choose a time horizon first. Users select Upbit, Binance, KOSPI, KOSDAQ, or US stocks and see one fixed list of up to five interest candidates for that bucket. The workflow reuses the existing deterministic candidate ranking, Practical Decision Card, Review Ranges, and candidate snapshot safety boundaries.

## Why market buckets replaced horizon-first UX

Short, Swing, and Long remain useful expert criteria, but they created an early conceptual choice before a beginner could identify the market they wanted to review. Market buckets match the first user question—where to look—and prevent 25 cards from appearing at once. The old horizon control remains collapsed under Expert Mode as Advanced criteria. Simple Mode does not require a horizon choice and uses the balanced Swing profile internally by default.

## Daily 08:00 basis

- The helper calculates the most recent local 08:00 basis, the next local 08:00 basis, a trading-date label, and whether the app opened before today's basis.
- After 08:00, the selected bucket creates its daily snapshot when candidate data becomes available and no current-date snapshot exists.
- Before 08:00, the most recent stored snapshot remains available; otherwise the UI explains that today's record is not ready.
- Price changes never reorder or recreate a saved list.
- Manual refresh recreates only the selected bucket's snapshot.
- Snapshots expire at the next daily basis and are limited to one latest record per bucket.

This is a frontend/local-time model. True KST generation at exactly 08:00 requires a reviewed backend scheduler and is deferred.

## Candidate selection

The selector receives existing candidate-engine output and catalog instruments. It only:

1. filters by Upbit, Binance, KOSPI, KOSDAQ, or US-stock identity;
2. excludes missing/non-positive prices;
3. preserves the existing deterministic order; and
4. takes at most five items.

It adds no score, recommendation, prediction, or ranking logic. When fewer than five valid candidates exist, only available items are shown with an explicit limited-data message. Raw scores are not rendered.

## Snapshot storage

`market-copilot.dailyBucketSnapshots.v1` stores a schema-versioned, runtime-validated record with trading date, bucket, basis/generation/expiry timestamps, a fixed item limit, and snapshot items. Corrupted payloads are discarded safely. Only one latest snapshot per bucket is retained, so Upbit/Binance and KOSPI/KOSDAQ cannot overwrite one another and history cannot grow without bound. Daily records contain no average price, memo, holding status, or transaction fields.

## AI Analysis UI

- Bilingual title and 08:00 explanation
- Five market-bucket tabs
- One selected-bucket snapshot panel and one candidate list only
- Up to five cards with current-price reference, change from basis, compact Practical Decision, and Review Ranges where allowed
- Manual selected-bucket refresh
- Collapsed Expert-only horizon criteria
- No separate live candidate list and no duplicate horizon lists

## My Analysis handoff

Daily card links include `bucketId`, `snapshotId`, and `instrumentId`. My Analysis validates the bucket, finds the daily record, restores its analysis baseline, and distinguishes today's record from a previous-date record. Daily snapshot data does not populate user note, average price, holding status, or any other personal context.

## Demo update

Getting Started now tells users to choose a market bucket, review today's five candidates, open one in My Analysis, check the current read and review ranges, and optionally enter their own recorded price when already holding. Presenter guidance now follows the same daily bucket flow.

## Safety wording

The UI consistently uses interest candidate, daily basis record, review information, and decision support. It does not label candidates as recommendations or signals and does not add transaction directions, order levels, future action prices, return claims, or performance tracking.

## Tests

Deterministic coverage includes:

- English and Korean bucket labels
- before/after 08:00 local basis calculation
- five-item cap and fixed order
- runtime storage validation and corruption recovery
- separate Upbit/Binance and KOSPI/KOSDAQ records
- absence of personal fields
- bucket filtering and invalid-price exclusion
- one visible list while switching all five buckets
- selected-bucket-only manual refresh
- Simple Mode without horizon-first controls
- Expert-only collapsed criteria
- daily My Analysis handoff and empty personal inputs
- updated Getting Started flow
- existing snapshot, Practical Decision, Review Range, beta readiness, and major-route regressions

Tests use supplied fixtures/mocks and do not call real DART, RSS, AI, backend, account, payment, or broker services.

## Deferred

- True server-side/KST 08:00 scheduled generation
- Notifications and push alerts
- Server-side daily records and cross-device synchronization
- Real AI
- Real stock providers
- Trading and order execution
- Backend, authentication, payment, and database
- Personalized portfolio-based candidate lists
- Paid release
