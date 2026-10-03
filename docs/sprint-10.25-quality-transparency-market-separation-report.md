# Sprint 10.25 — Candidate Quality Transparency and Market Asset Separation

## Scope

Sprint 10.25 makes two existing review boundaries easier to understand. AI Analysis explains why fewer than five candidates may be shown without weakening the existing review basis, while Market separates Crypto, Korea Stocks, and US Stocks into explicit asset workspaces. The sprint does not change candidate scoring, ranking, snapshot order, technical calculations, providers, investment logic, or chart-overlay calculations.

No real AI, stock provider, backend, account, payment, broker, order flow, prediction, or recommendation is added.

## Candidate quality transparency

The AI Analysis workspace classifies the already calculated candidate source into three presentation states:

- `displayed`: candidates that meet the current review basis and the Standard score threshold of 60;
- `heldForReview`: candidates with a score from 50 through 59, or otherwise reviewable candidates whose evidence is incomplete, changed, or expired, that remain outside the main candidate list; and
- `excluded`: candidates with an invalid or unavailable price, unavailable data quality or current basis, unavailable decision state, unavailable score, or a score below 50.

Hard data and basis failures take priority over score thresholds. The classifier preserves source order and does not mutate the input. It reuses the existing deterministic review score and does not calculate a second score.

The quality summary uses the bilingual labels `Candidate quality summary` / `후보 품질 요약`, `Displayed` / `표시 후보`, `Held for review` / `보류 후보`, and `Excluded` / `제외 후보`. Its counts form one current quality-scan partition, stopping once five displayable candidates have been found or the bounded source is exhausted. It explains that only candidates passing the current review basis are shown, that weak candidates are not added merely to fill five slots, and that this current scan is separate from the saved daily list.

Excluded reasons are grouped into neutral review explanations:

- `Review score too low` / `검토 점수 부족`
- `Review basis insufficient` / `판단 근거 부족`
- `Current price unavailable` / `현재 가격 확인 불가`
- `Data quality insufficient` / `데이터 품질 부족`
- `Current basis unavailable` / `현재 기준 비교 불가`

Simple Mode keeps this explanation compact and count-based. Expert Mode may expose the excluded-symbol detail in a collapsed disclosure. Held candidates are never inserted into the fixed daily list, never consume one of its five positions, and never receive a My Analysis snapshot handoff.

The obsolete, unused binary `MarketBucketSummary` implementation was removed so a second `displayed/excluded` contract cannot drift from the active three-state summary in `MarketContextStrip`.

## Display filter

The quality display filter is a presentation preference only:

- `Strict` / `엄격`: show fixed snapshot candidates whose existing score is at least 70;
- `Standard` / `표준`: show fixed snapshot candidates whose existing score is at least 60; this is the default; and
- `Wider view` / `넓게 보기`: keep the Standard main list and reveal the separate held-for-review section.

The preference is stored locally under `market-copilot.candidateDisplayFilter.v1`. Loading validates the stored value and falls back to Standard when storage is absent, malformed, inaccessible, or unsupported.

Changing this filter performs a stable display projection only. Standard and Wider keep the saved daily membership and order unchanged. Strict applies its threshold from the immutable saved snapshot basis, so asynchronous provider updates cannot silently change membership. No filter rewrites a daily snapshot, triggers refresh, changes the selected bucket, or alters the candidate quality gate. The fixed list remains unchanged until the existing deliberate candidate-refresh flow completes.

## Market asset workspaces

The Market page now begins with a prominent bilingual asset selector:

- `Crypto` / `코인`
- `Korea Stocks` / `한국 주식`
- `US Stocks` / `미국 주식`

The selected asset mode is stored defensively under `market-copilot.marketAssetMode.v1`; an absent or invalid value falls back to Crypto. A separate runtime-validated local record remembers the last compatible selected instrument for each asset mode. An instrument explicitly selected from Global Search, News, or another supported route takes precedence when entering Market, so restoring a saved mode cannot silently replace the user's navigation target.

Each mode exposes only its own venues and instruments:

- Crypto: Upbit and Binance, with BTC/KRW preferred when no compatible previous selection exists;
- Korea Stocks: KOSPI and KOSDAQ beta catalogs, with Samsung Electronics (`005930`) preferred; and
- US Stocks: NASDAQ and NYSE beta catalogs, with Apple (`AAPL`) preferred.

When a preferred instrument is unavailable, the first valid instrument in the active asset catalog is used. Switching mode updates the venue, list, selected instrument, chart, trading-information context, and Market Copilot context together. Previous search text is cleared at the mode boundary so it cannot make a new asset workspace appear empty.

The workspace headers make data boundaries explicit. Crypto identifies the Upbit/Binance review context. Korea and US workspaces retain visible Beta language and state that a live stock provider is not connected. Stock rows show their board or exchange when it meaningfully distinguishes the instrument, while crypto rows retain the existing mixed-quote treatment.

## Preserved behavior

Sprint 10.25 preserves:

- the daily 08:00-basis snapshot schema, maximum of five displayed candidates, saved item order, manual refresh flow, and My Analysis handoff;
- existing candidate score, Practical Decision, Review Ranges, BTC anchor, and technical-reference logic;
- Market chart, orderbook, recent trades, favorites, sorting, search, virtualization, sidebar/list collapse, chart-overlay controls, Analysis Mode, and per-instrument user lines;
- LIVE/MOCK status and existing provider boundaries; and
- bilingual Simple/Expert presentation without creating an additional investment result.

## Safety boundary

Candidate quality is an explanation of deterministic review-data sufficiency. It is not a return probability, AI confidence, prediction, ranking change, personalized recommendation, or transaction instruction. A wider display is not a weaker quality gate: held candidates remain visually and structurally separate from the main list.

Market asset separation is navigation and presentation only. Korea and US catalogs remain beta/mock data until a future reviewed provider sprint. No mode change creates an order, alert, notification, strategy action, or automatic candidate refresh.

## Automated test boundary

Local deterministic coverage locks:

- displayed, held, and excluded classification boundaries and reason counts;
- Strict, Standard, and Wider display behavior, safe preference persistence, stable ordering, and main-list isolation;
- fixed snapshot data and order before manual refresh;
- Crypto default and BTC preference, Korea and US workspace copy, compatible previous selections, and per-mode last-selection persistence;
- cross-asset list and search isolation, KOSPI/KOSDAQ and US exchange context, and chart/detail synchronization after a mode switch; and
- absence of transaction-oriented labels in the new product copy.

Tests use local fixtures and mocked service boundaries. They must not call a real exchange, DART, RSS, AI, backend, account, payment, broker, or other external service.

## Validation

Final validation from `frontend/` completed successfully:

- `npm run test:proxy`: 10 tests passed;
- `npm run lint`: passed with the pre-existing TanStack Virtual / React Compiler compatibility warning only;
- `npm run typecheck`: passed with the full TypeScript build check;
- `npm run test -- --maxWorkers=1`: 110 test files and 495 tests passed;
- `npm run build`: passed with 318 modules transformed; and
- `git diff --check`: passed.

Browser automation and executable launch are outside this sprint's security boundary. Responsive behavior is therefore locked through component, accessibility, and stylesheet contracts; final manual viewport review remains a release-check activity.

## Deferred

- Production Korea and US stock providers
- Account or cloud synchronization of display preferences
- Server-generated daily snapshots, schedules, and notifications
- Real AI analysis, forecasting, confidence, or personalized recommendations
- Orders, broker integration, automated trading, alerts, and strategy execution
- Candidate-score, ranking, or quality-gate revisions beyond the existing deterministic basis
