# Sprint 10.24 — Market Layout Expansion and Editable Chart Overlays

## Scope

Sprint 10.24 turns the Sprint 10.23 chart-overlay contract into a practical Market workspace. It expands chart space, draws deterministic technical references on the existing `lightweight-charts` chart, and adds locally stored user reference lines. It does not change candidate ranking, the technical-level calculation engine, investment logic, or any AI Analysis or My Analysis result.

The sprint remains a chart-review and workspace-usability feature. It does not add a provider, external API, backend, account, payment, broker, order flow, alert, prediction, or recommendation.

## Sidebar pinning

The main application shell adds an accessible pinned/unpinned sidebar preference:

- The sidebar is pinned by default.
- A user can unpin it to leave a narrow rail at the left edge.
- Pointer hover or keyboard focus temporarily reveals the unpinned sidebar without changing the saved preference.
- Leaving the sidebar hides the transient panel again while preserving normal navigation.
- The control uses the bilingual labels `Pin sidebar` / `사이드바 고정` and `Unpin sidebar` / `사이드바 고정 해제`.
- The preference is stored locally under `market-copilot.sidebarPinned.v1` and falls back safely to the pinned state when storage is absent or invalid.
- Narrow and mobile layouts must keep navigation reachable without forcing desktop-width overflow.

The preference changes layout only. It does not change routes, navigation authorization, or product state.

## Market instrument-list expansion

The selected-instrument Market workspace gives more width to the chart while retaining the existing explorer workflow:

- The instrument list uses a narrower desktop width, targeting approximately `300–360px` with a usable minimum near `260px`.
- The list can collapse to a compact rail near `48–64px`, allowing the chart to consume the released width.
- The collapse preference is persisted locally and restored defensively.
- Search, market filters, sorting, favorites, selection, and virtualized-list behavior remain available when the list is expanded.
- A visible, keyboard-operable restore control remains available while it is collapsed.
- The bilingual UI uses `Instrument list` / `종목 목록`, `Collapse instrument list` / `종목 목록 접기`, `Expand instrument list` / `종목 목록 펼치기`, and `Expand chart` / `차트 넓게 보기`.

Collapsing the list is a presentation change only. It must not clear the selected instrument, change list ordering, or start a new data request.

## Actual chart overlays

The Market candlestick chart now consumes the typed overlay results introduced in Sprint 10.23. The existing deterministic technical engine remains the only source for automatic chart references.

Supported automatic groups are:

- support and resistance references;
- simple moving averages for 5, 20, and 60 valid closes; and
- Fibonacci references at `0.382`, `0.5`, and `0.618`.

User reference lines form a fourth, separate group. Group controls allow support/resistance, moving averages, Fibonacci references, and user lines to be shown or hidden without recalculating or deleting their data. The chart uses muted, distinguishable colors and concise labels so reference lines do not resemble execution signals.

When the existing candle history cannot support technical calculation, automatic lines are omitted and the workspace displays:

- English: `Not enough data to calculate chart reference lines.`
- Korean: `차트 기준선을 계산할 데이터가 부족합니다.`

No missing candle is fabricated, interpolated, or replaced. Automatic lines are not copied into user storage.

## Chart Analysis Mode

Chart Analysis Mode is an explicit manual workspace for locally managed horizontal reference lines. Its bilingual controls are:

- `Analysis mode` / `분석 모드`
- `Exit analysis mode` / `분석 모드 종료`
- `Add horizontal line` / `수평선 추가`
- `Edit selected line` / `선택한 선 수정`
- `Delete selected line` / `선택한 선 삭제`
- `User reference line` / `사용자 기준선`
- `Line name` / `기준선 이름`
- `Line price` / `기준선 가격`

Manual line entry and editing are sufficient for this foundation. Direct drag-to-move interaction is intentionally deferred until chart interaction and keyboard behavior can be reviewed together.

Each user line contains:

- `id`
- `instrumentId`
- `label`
- `price`
- `createdAt`
- `updatedAt`
- `visible`

User lines are isolated per instrument and stored under `market-copilot.userChartLines.v1`. Storage loading uses runtime validation; malformed payloads, invalid prices, incomplete line records, or schema mismatches cannot crash the workspace and must recover to a safe empty state. Adding, editing, hiding, or deleting a user line does not affect technical calculations, candidate status, watchlists, or any other investment workflow.

## Compact technical summary

A compact Market-specific technical panel sits near the chart. It provides only the context needed while reviewing the selected instrument:

- first available support and resistance;
- concise MA5, MA20, and MA60 context when available;
- Fibonacci reference context;
- overlay group visibility controls; and
- Chart Analysis Mode controls for user lines.

The panel reuses the Sprint 10.23 technical result instead of creating a second calculation path. It does not reproduce the full My Analysis report, Practical Decision, Review Ranges, candidate scoring, or personalized context.

Loading, mock, limited, and unavailable data states remain explicit. User lines may remain visible as the user's own stored references when automatic analysis is unavailable, but the interface must not imply that they were calculated or validated by the application.

## Safety boundary

Every chart-reference presentation keeps the exact safety statement visible:

- English: `Chart reference lines are review references, not trade instructions.`
- Korean: `차트 기준선은 거래 지시가 아니라 차트 검토 기준입니다.`

Support, resistance, moving averages, Fibonacci references, and user lines are historical or user-entered review aids. They are not order prices, entry or exit instructions, stop-loss or take-profit levels, targets, return probabilities, guarantees, alerts, or automated actions.

This sprint must not introduce buy, sell, entry, stop, take-profit, or target wording. It must not change Watch Score, candidate quality gates, saved candidate order, Practical Decision, Review Ranges, Daily candidate snapshots, BTC market anchors, or My Analysis logic.

## Responsive behavior

The layout is designed to remain usable across wide desktop, narrower desktop, and mobile-sized content containers:

- Wide layouts prioritize the chart while keeping the compact instrument list and trading context readable.
- Collapsing the list expands the chart without changing the selected instrument.
- Narrow layouts reduce fixed column assumptions and avoid page-level horizontal overflow.
- Controls may wrap or stack while preserving their order, labels, focus visibility, and touch targets.
- The sidebar rail, list restore control, chart legend, technical summary, and analysis controls remain keyboard reachable.
- No breakpoint may hide the only control that restores a collapsed navigation or instrument panel.

## Automated test boundary

Coverage should lock the following behavior with local fixtures and mocked service state only:

- sidebar default, persisted pin state, invalid-storage fallback, and keyboard-accessible reveal/control behavior;
- instrument-list default, collapse/expand persistence, selected-instrument retention, and narrow-layout restore access;
- actual support/resistance, MA, Fibonacci, and user-line rendering contracts;
- independent overlay-group visibility without modifying underlying calculations;
- Analysis Mode add, edit, delete, select, and exit behavior;
- per-instrument user-line isolation, schema validation, invalid-storage recovery, and visibility persistence;
- automatic-line separation from user storage;
- technical summary loading, mock, limited, available, and unavailable states;
- exact bilingual unavailable and safety language; and
- continued Market search, sort, favorites, selection, chart, orderbook, trades, and AI Copilot synchronization.

Tests must not call a real exchange, DART, RSS, AI, backend, account, payment, broker, or other external service.

## Validation

Final validation from `frontend/`:

- `npm run test:proxy` — passed, 10/10 tests.
- `npm run lint` — passed with the one pre-existing React Compiler compatibility warning in `MarketExplorer.tsx`.
- `npm run typecheck` — passed with the project-reference build (`tsc --build --force`).
- `npm run test -- --maxWorkers=1` — passed, 108 files and 472 tests.
- `npm run build` — passed, 317 modules transformed.
- `git diff --check` — passed.

Focused coverage additionally passed for sidebar pinning, Market list layout, daily technical-data reuse, actual chart price lines, group visibility, Analysis Mode controls, and per-instrument user-line storage. App and Market layout tests disable `fetch`, and the technical/chart tests use local fixtures and mocked service/chart boundaries only.

Automated checks cover wide/narrow layout contracts through state, ARIA, and CSS behavior. Manual browser viewport review was not run because this task's active security boundary prohibits browser automation. No executable was launched.

## Deferred

- Dragging user lines directly on the chart
- Cloud or account synchronization of layout and user-line preferences
- Backend persistence, shared workspaces, and multi-device collaboration
- New technical calculations or alternate calculation timeframes
- Alerts, notifications, strategy execution, orders, or broker integration
- AI interpretation, forecasting, probabilities, recommendations, or personalized advice
- Any change to candidate ranking, investment logic, or My Analysis decision logic
