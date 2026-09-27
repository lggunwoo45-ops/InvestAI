# Sprint 10.19.1 — Release Blocker Fixes after Internal QA

## Outcome

Sprint 10.19.1 fixes only the four blockers recorded by the internal release-candidate QA. It adds no candidate scoring, investment, AI, provider, trading, backend, authentication, payment, database, alert, or deployment behavior.

## Previous-day daily record wording

The Daily candidate panel now compares the saved snapshot `tradingDate` with the local date represented by the panel clock. A current-date record keeps **Today’s 08:00 snapshot record / 오늘 08:00 기준 기록**. A different date is labelled **Previous daily snapshot record / 이전 날짜 기준 기록** and explicitly says that it is not today’s basis and current data may differ. Its list heading also refers to candidates from that saved record instead of calling them today’s candidates.

Expired Daily records remain visible. Their stale notice now directs users to **Refresh today’s candidates / 오늘 후보 새로고침** to create a current record. Existing My Analysis handoff keeps the saved baseline and shows the previous-daily-record notice.

## Numeric review-range safety

Candidate cards that render numeric review ranges now keep a compact visible boundary next to those ranges:

- `Review ranges are decision-support areas, not order prices.`
- `검토 범위는 주문가가 아니라 판단 보조용입니다.`

The shared range component applies the same boundary consistently in My Analysis. No direct transaction label, future action price, stop level, profit-taking level, or target recommendation was added.

## Product identity normalization

Current application surfaces use **Market Copilot Beta** as the product label and **Beta Preview** as the shell build label. The sidebar no longer shows the old `v0.6.2` label, and Demo no longer presents `1.5 Beta` as the current product version. Demo positioning and flow now describe the current market-bucket → fixed daily list → My Analysis → current read/review range journey instead of the older horizon/planning-zone-first journey.

Historical Sprint reports and internal packaging identifiers were not rewritten. The current frontend README explicitly distinguishes compatibility packaging names from the user-facing beta label.

## Daily bucket refresh regression

The failing integration test was environment-dependent rather than evidence of cross-bucket storage replacement: it opened AI Analysis in the default LIVE mode and expected candidate data to become available even when public exchange access was unavailable. The test now selects the built-in MOCK provider through the public Market UI before entering AI Analysis. This preserves the actual application flow while making candidate availability deterministic.

The strengthened test stores Upbit/Binance and KOSPI/KOSDAQ records, refreshes Upbit and then KOSPI, verifies Binance and KOSDAQ remain unchanged, and confirms only one selected-bucket list is visible. Product refresh and storage logic were not weakened or changed.

## Tests added or updated

- Today’s record keeps today-specific wording.
- A previous-date record cannot present itself as today and uses its own list heading.
- An expired Daily record shows the Daily refresh recovery message.
- A previous Daily record still opens My Analysis with the historical handoff note.
- Candidate ranges render the compact English and Korean non-order-price boundary.
- Unsafe direct-action labels remain absent.
- Sidebar and Demo tests reject the old user-facing version labels.
- Selected-bucket refresh isolation covers two crypto and two stock buckets without live-network dependency.

## Remaining known issues

- Daily records remain browser-local and use the device’s local time. True KST 08:00 scheduled generation requires a reviewed backend scheduler.
- Stock catalog values remain mock/limited.
- RSS, local news proxy, and DART availability remain optional and visibly bounded.
- Real AI, trading, accounts, payment, database, cloud sync, and production stock providers remain unavailable.
- Manual visual, responsive, keyboard, screen-reader, and legal/compliance review remain separate release gates.

## Validation

- `npm run test:proxy`: passed, 2 suites / 10 tests
- `npm run lint`: passed with the existing `MarketExplorer.tsx` React Compiler compatibility warning
- `npm run typecheck`: passed
- `npm run test -- --maxWorkers=1`: passed, 86 files / 376 tests
- `npm run build`: passed, 293 modules transformed
- Targeted blocker regression: passed both in the related five-file run (57/57) and alone (1 passed / 26 skipped)
- `git diff --check`: passed
