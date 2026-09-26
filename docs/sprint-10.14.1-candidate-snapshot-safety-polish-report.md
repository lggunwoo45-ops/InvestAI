# Sprint 10.14.1 — Candidate Snapshot Safety Polish and QA Hardening

## What was audited

The post-merge review covered the Candidate Snapshot panel, its local data boundary, freshness presentation, saved ordering, and the snapshot-to-My Analysis handoff. It also checked current beginner-stage labels in UI, tests, and current documentation. No provider, model, transaction, account, or backend scope was added.

## User-facing copy

The list-level wording now consistently calls the list a snapshot record or 기준 기록. “Recommendation” appears in this flow only inside the explicit negative disclaimer. The current labels remain Interest candidates / 관심 후보 목록, Refresh candidates / 후보 새로고침, Change check needed / 변화 확인 필요, and Current state unavailable / 현재 상태 확인 불가.

## Disclaimer visibility

The bilingual disclaimer is visible once directly beneath the snapshot panel heading in every display mode. It includes the recorded time, states that the list is not a current investment recommendation, and explains that it does not update until the user refreshes candidates. It is not hidden inside card details or repeated on every item.

## Expiration and stale behavior

Expired snapshots remain visible and are never deleted or refreshed automatically. The panel uses a muted stale treatment and displays three explicit messages: that the snapshot expired, that manual refresh can create a current record, and that the earlier basis must not be read as a current judgment.

## Current price and change styling

Basis, Current, and Change since basis remain separate fields. The change value has an explicit neutral tone and no direction, gain, loss, performance, or return styling. It is not used for candidate ordering or freshness classification.

## Order stability

Snapshot cards continue to render by saved `order`. Tests now cover current-price updates, rule/freshness changes, and expiration without reordering. A replacement order appears only after the explicit refresh callback supplies a new snapshot. Automatic re-ranking was not added.

## My Analysis handoff

My Analysis distinguishes active, expired, and missing snapshot links. Active records show the normal snapshot-origin note. Expired records remain usable as historical baseline context and show a warning that current data may differ. Missing records fall back to current data. Snapshot basis remains separate from the existing average-price and personal-note inputs.

## Beginner stage consistency

Current UI and documentation use Waiting / checking conditions, Observation start, Conditions forming, Conditions clear, Movement expansion caution, and Sharp-drop rebound caution, with their Korean equivalents. Numbered beginner interest-stage labels are absent from current UI copy.

## Snapshot data boundary

The snapshot contract is limited to instrument identity, captured market basis, captured status and observation stage, rule basis, data quality, timestamps, engine version, and saved order. Regression assertions reject personal average price, user note, holding or position-review state, action prices, profit/loss fields, personal data, Watch Score, raw score, and confidence-score fields.

## Tests added or strengthened

- Exact English and Korean list-level disclaimer checks
- Stable ordering after current-price and freshness changes
- Stable ordering in expired state
- Explicit refresh boundary before a replacement order is rendered
- Neutral change-tone assertion
- Active, expired, and missing My Analysis handoff coverage
- Expanded snapshot forbidden-field assertions

All tests remain fixture-based and do not call real DART, RSS, AI, or market APIs.

## Deferred

- Claude external review
- Position-review threshold redesign
- Server-side snapshot synchronization and multi-device history
- Alerts, push notifications, and performance tracking
- Automatic re-ranking
- Real AI and real stock providers
- Trading and order execution
- Backend, authentication, payment, and database systems
