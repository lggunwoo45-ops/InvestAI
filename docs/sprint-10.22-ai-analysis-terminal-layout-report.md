# Sprint 10.22 — AI Analysis Terminal Layout

## Outcome

`/ai-analysis` now presents the existing daily candidate workflow as a compact research terminal. The sprint changes information architecture and presentation only. It does not change candidate ranking, the quality gate, the daily 08:00 snapshot rule, Practical Decision, Review Ranges, Bitcoin-anchor calculation, providers, or investment logic.

## Terminal information architecture

1. **Compact terminal header** — selected market bucket, daily-basis state, displayed and excluded counts, BTC-anchor status for crypto buckets, data state, and the safety boundary are visible together.
2. **Market bucket tabs** — the existing Upbit, Binance, KOSPI, KOSDAQ, and US-stock selector remains the only bucket switcher.
3. **Market context strip** — crypto buckets show BTC price, current read, review score, and caution separately from candidates. Stock buckets show bucket, data, news, and DART review context without inventing disclosure availability.
4. **Candidate workspace** — one compact, ordered list appears on the left and one selected-candidate inspector appears on the right. The first eligible candidate is selected by default.
5. **Selected-candidate inspector** — shows the neutral snapshot order and basis, current reference price, neutral basis change, Practical Decision, Review Ranges, saved rule evidence, evidence-state changes, cautions, and an explicit My Analysis handoff.
6. **Advanced controls** — Expert Mode retains horizon criteria. Candidate recalculation is visually secondary and requires two deliberate clicks before replacing the saved daily record.

## Preserved product behavior

- Candidate engine order and the maximum-five rule are unchanged.
- The candidate quality gate is reused unchanged; the terminal does not re-score, re-rank, or fill weak slots.
- Saved candidates do not reorder when current prices or evidence freshness change.
- The existing daily snapshot is still created according to the current 08:00 behavior and is not repeatedly refreshed in the background.
- BTC context remains independent of candidate slots and candidate quality filtering.
- Upbit and Binance show the BTC anchor even when the candidate list is empty; stock buckets do not show it.
- Simple Mode and Expert Mode share the same terminal workspace. Expert-only criteria remain collapsed.
- My Analysis receives the existing instrument, market bucket, and snapshot identifiers only after an explicit inspector action.
- No second live candidate list was added.

## Responsive behavior

The terminal root establishes an inline-size container. This is intentional: at a 1366-pixel viewport, the sidebar and AI Copilot can leave the center workspace much narrower than the viewport itself.

- Wide content containers use a list-and-inspector split.
- At 1040 content pixels or less, the workspace stacks the candidate list before the inspector.
- Context metrics collapse from four columns to two and then one based on the actual center-workspace width.
- Candidate columns progressively hide lower-priority change and range fields while keeping symbol, price, score, and current read available.
- Natural page scrolling is retained; no additional nested scrolling area is introduced.

## Component boundaries

- `AiAnalysisTerminalLayout` owns terminal composition and responsive workspace placement.
- `MarketTerminalHeader` owns compact daily/bucket/data metadata.
- `MarketContextStrip` owns crypto-anchor or stock evidence context.
- `candidateTerminalModel` converts an already-filtered snapshot into immutable display rows. It calls the existing freshness, Practical Decision, Review Range, and review-score builders and never changes order.
- `CandidateTerminalList` owns compact selection and guarded two-click recalculation.
- `CandidateInspectorPanel` owns the selected candidate's expanded evidence and My Analysis handoff.
- `AiAnalysisPage` remains the orchestration boundary for catalogs, candidate engines, quality filtering, snapshots, and navigation.

## Empty and limited states

- Zero eligible candidates produces a neutral empty list and empty inspector while retaining crypto BTC context.
- One to four candidates are shown honestly with a limited-count explanation; blank slots are not created.
- Missing current price, missing comparison basis, expired snapshot, mock data, and unavailable BTC context remain explicit.

## Accessibility and interaction

- Existing market tabs, daily snapshot region names, single ordered list, and heading hierarchy remain testable.
- Candidate rows are real buttons with `aria-pressed` selection state.
- The inspector is a separately named complementary landmark.
- Keyboard focus uses visible terminal-accent outlines.
- Positive and negative numeric changes retain explicit signs rather than depending on color alone.
- The terminal no longer adds a nested `main` landmark inside the application shell.

## Tests added or updated

- Terminal view-model fixed order, five-item cap, price fallback, and input immutability.
- Header English/Korean metadata, data states, safety text, and crypto anchor status.
- Crypto and stock market-context rendering, including BTC-anchor separation and DART boundary wording.
- Compact list selection, zero and partial lists, before-08:00 state, and two-click recalculation.
- Selection-to-inspector integration and explicit My Analysis handoff.
- Inspector populated and neutral-empty states.
- App-shell single-list behavior, market switching, Simple/Expert parity, and selected-bucket recalculation isolation.
- The time-dependent recalculation test now fixes only `Date`, keeping asynchronous behavior real and network-independent.

## Validation

- Local proxy suites: 10/10 passed.
- Lint: passed with the existing React Compiler compatibility warning in `MarketExplorer.tsx` only.
- TypeScript project build: passed.
- Frontend tests: 98 files, 414/414 passed with one worker.
- Production build: passed, 307 modules transformed.
- Whitespace/error check: `git diff --check` passed.

## Deferred

- Real AI inference, forecasts, recommendations, or model calls
- Trading, order entry, broker integration, and automation
- Real stock providers and fundamentals
- Backend scheduling or server-persisted 08:00 records
- Authentication, accounts, payment, and database
- New DART or news provider calls

## Safety boundary

The terminal is a decision-support workspace. It does not output transaction direction, order prices, future prices, return probabilities, or profit guarantees. Candidate prices and ranges remain reference context tied to the saved evidence basis.
