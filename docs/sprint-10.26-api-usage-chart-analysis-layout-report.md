# Sprint 10.26 — API Usage Visibility and Non-Obstructive Chart Analysis Layout

## Scope

Sprint 10.26 makes the beta's existing dependency boundaries visible and keeps chart review tools available without covering the primary chart by default. It does not change investment logic, candidate scoring, review ranges, technical-level calculations, provider selection, or chart-line calculations.

No real AI, trading, stock provider, backend, authentication, payment, database, deployment, or secret-management dashboard is added.

## API usage visibility

The Demo workspace includes a bilingual API Usage Status panel for:

- News proxy;
- DART proxy;
- server-side DART API key configuration;
- Real AI; and
- Trading.

The panel distinguishes active, not-configured, disabled, unavailable, and not-yet-observed states. News status reuses the provider state already observed by the application. Real AI and Trading remain explicitly disabled rather than being presented as failures.

The DART status check uses the dedicated local proxy health contract. It does not probe OpenDART and does not turn a missing key into a frontend error. The UI explains that private exchange APIs, brokerage APIs, and real AI APIs are not used.

The local News and DART prototypes retain their existing development-origin allowlists. A packaged demo or separately hosted frontend therefore reports a proxy as unavailable unless that deployment is deliberately configured with an approved proxy origin; expanding that deployment policy is deferred rather than silently broadening CORS in this sprint.

## DART health endpoint and key safety

`GET /api/dart/health` reports only:

- `status`: `ready` or `disabled`;
- `apiKeyConfigured`: a boolean; and
- a fixed, non-secret message.

The endpoint checks only whether the server-side `DART_API_KEY` value is non-empty. It never calls the OpenDART upstream, returns the key, logs the key, places it in Vite runtime configuration, or exposes it to a browser bundle. Invalid and unavailable health responses are handled as unavailable or unknown UI state without fabricating configuration success.

Proxy tests inject placeholder values and mocked request boundaries. They do not require or call a real DART, RSS, or AI service.

## Chart analysis layout

The Market chart remains the primary visual area. Chart Structure Analysis now begins as a compact, in-flow summary containing the first support, first resistance, and moving-average context. The full technical structure is hidden by default and opens only through the explicit bilingual expand control.

The expanded content occupies reserved document layout below the compact summary instead of an opaque layer over the chart. It has a matching collapse control and exposes a layout state for deterministic styling and testing. The preference is stored locally under `market-copilot.chartStructurePanelCollapsed.v1`; missing, invalid, or inaccessible storage safely falls back to collapsed.

## Preserved chart behavior

The layout change preserves:

- automatic support and resistance lines;
- moving-average and Fibonacci lines;
- overlay group visibility controls;
- Analysis Mode;
- adding, editing, hiding, showing, and deleting per-instrument user lines; and
- the existing rule-based technical calculations and data-quality cautions.

The controls remain reachable while the full structure detail is collapsed. No chart label becomes an execution instruction, transaction-oriented label, or executable price signal.

## Automated coverage

Deterministic tests cover:

- configured and missing DART-key health responses without upstream fetches or key disclosure;
- API usage-state mapping and invalid health payload handling;
- Korean and English API status labels;
- DART configured and not-configured presentation without secret-like output;
- Real AI and Trading disabled presentation;
- default-collapsed Chart Structure Analysis;
- expand, collapse, and persisted-preference behavior;
- compact support, resistance, and moving-average context;
- non-overlay chart layout state;
- preserved overlay groups and Analysis Mode user-line actions; and
- Korean and English chart controls.

## Validation

Final validation from `frontend/` completed successfully:

- `npm run test:proxy`: 12 tests passed;
- `npm run lint`: passed with the pre-existing TanStack Virtual / React Compiler compatibility warning only;
- `npm run typecheck`: passed with the full TypeScript build check;
- `npm run test -- --maxWorkers=1`: 111 test files and 510 tests passed;
- `npm run build`: passed with 322 modules transformed; and
- `git diff --check`: passed.

Browser automation and executable launch are prohibited by this sprint's security boundary. Manual viewport and browser-console review therefore remain release-check activities rather than automated claims in this report.

## Deferred

- Cloud secret-management dashboard
- Hosted proxy health monitoring
- Real economic-calendar API
- Full TradingView-style dock management
- Drag-to-draw advanced chart tools
- Backend, authentication, payment, and database services
- Real AI inference
- Trading, broker, and order execution
