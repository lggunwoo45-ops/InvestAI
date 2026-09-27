# Sprint 10.15 — Practical Decision Card and Review Ranges

## Outcome

My Analysis and the fixed candidate snapshot list now translate the existing deterministic evidence into a concise practical review state. Live-data workflows can also show approximate review ranges. These additions are decision-support presentation only: they do not place orders, predict returns, execute an AI model, or change the existing candidate ranking.

## Practical decision model

The shared typed model supports eight bilingual states: Wait for now, Add to watch, Approach review possible, Already extended, Post-drop review needed, Change check needed, Re-check holding basis, and Not enough basis. State selection reuses existing data quality, Action Readiness, candidate observation stage, snapshot freshness, and optional user-entered average-price context.

Each result contains one current read, a short summary, a reason, the next item to check, and an explicit safety boundary. Mock, limited, unavailable, or otherwise unreliable inputs resolve conservatively to Not enough basis. A snapshot change, an expired record, and an entered average price use state-specific explanations so an older status explanation cannot contradict the visible state.

## Review ranges

The range model creates at most three approximate areas from a valid live-data anchor:

- Approach review range
- Risk re-check basis
- Profit protection review range

The calculation uses internal Short-term, Swing, and Long-term widths but does not show those internal percentages in the UI. Snapshot cards anchor ranges to their saved basis price, preserving the fixed record until manual refresh. Expired snapshots label ranges as historical context. Mock, limited, unavailable, invalid, or missing price data produces an explicit unavailable state instead of an invented range.

The UI identifies every value as a review range rather than an order price and keeps the final decision with the user. It adds no entry, stop-loss, take-profit, target-price, buy, or sell instruction. Buy/sell wording appears only in the negative safety disclaimer.

## Candidate snapshot integration

Each visible fixed candidate card now includes a compact Practical Decision Card and the primary review range. Candidate order, saved items, manual refresh, horizon isolation, freshness comparison, and current-price reference behavior remain unchanged. Continuously calculated candidates remain internal refresh input and are not rendered as a second list.

## My Analysis integration

For a selected instrument, the Practical Decision Card and Review Range panel appear near the top of the report in both Simple and Expert display modes. A valid user-entered average price changes the practical read to Re-check holding basis and anchors the range to that personal reference only for the current analysis session. It is not treated as market evidence or persisted by this feature.

The plain-text copy summary now includes the practical read, short summary, first available review range, next check, caution, and existing disclosure boundary. Position review wording is neutralized to Re-check holding basis instead of automatically interpreting a positive or negative distance as a profit or invalidation state.

## Testing

Coverage includes all decision-state families, conservative data-quality gating, state-specific override copy, horizon-dependent ranges, invalid and unavailable range inputs, component rendering, bilingual labels, Candidate Snapshot integration, My Analysis ordering and average-price transition, copied summaries, and forbidden transaction wording.

All fixtures remain deterministic. No live provider, DART, RSS, AI, trading, backend, authentication, account, payment, or database call is introduced by these tests.

## Deferred

- Real AI inference, forecasts, probabilities, and confidence claims
- Real stock providers and live-data entitlement
- Trading, orders, alerts, and execution
- Server-side user profiles or personalized recommendations
- Backend, authentication, account, payment, and database systems
- Automated candidate refresh or price-driven re-ranking

