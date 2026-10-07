# Sprint 10.28 — Evidence-Based AI Copilot Final Read Engine

## Summary

Sprint 10.28 changes AI Copilot Final Read from a practical-decision label mapper into a deterministic, evidence-based synthesis. It uses only data already loaded by Market Copilot. It does not call a generative model, create an execution signal, or add a server dependency.

## Why results previously converged on Wait

The Market AI Copilot built My Analysis without a watch-candidate record. That made Action Readiness resolve to `waiting` for most ordinary instruments, and Practical Decision then resolved to `wait`. Final Read mapped that state directly. Technical analysis was reduced to a boolean availability flag, so trend, momentum, volume, and support/resistance differences could not affect the conclusion. The selected symbol changed, but most of its differentiating evidence did not reach the rule engine.

## Evidence now used

- selected instrument symbol and market type
- current-price availability
- loaded candle-series availability
- candidate review score when available
- practical decision state
- moving-average technical trend
- recent movement / momentum band
- recent volume relative to its available candle baseline
- proximity to observed support and resistance
- optional Bitcoin anchor context
- optional daily market caution context
- recorded-position review state
- saved-basis freshness / change-review state
- live, mock, limited, or unavailable data quality

Missing optional inputs degrade gracefully. The result exposes both source-factor names and human-readable evidence values so the UI can explain its conclusion.

## Exact rule priority

1. An active recorded-position review returns **Re-check holding basis**.
2. Missing current price, unavailable data, or fewer than two usable evidence groups returns **Not enough data**.
3. A stale or materially changed saved basis returns **Change check needed**.
4. Strong positive extension, material distance from the nearest average, a move beyond observed resistance, or elevated activity near resistance returns **Already extended**.
5. Constructive score / decision evidence combined with usable trend and structure returns **Approach review possible**.
6. Mixed but usable score, trend, or support evidence returns **Keep watching**.
7. Weak, unclear, or unfavorable evidence returns **Wait for now**.

Bitcoin volatility or severe wider-market caution caps an otherwise constructive crypto result at **Keep watching**. Market caution also lowers the displayed evidence confidence and adds an explicit caution.

## Example deterministic states

- constructive trend, positive momentum, usable structure, and aligned review evidence: **Approach review possible**
- medium or mixed evidence: **Keep watching**
- weak score with downward evidence: **Wait for now**
- strong recent expansion or stretched structure: **Already extended**
- missing current evidence: **Not enough data**
- stale saved basis: **Change check needed**
- active recorded-position context: **Re-check holding basis**

## Scenario integration

The existing upside, neutral, and downside scenarios remain below Final Read. For Wait, Approach review possible, and Already extended, scenario summaries and checks are adapted from the same Final Read context. They describe improvement, consolidation, stabilization, and weakening conditions without execution language.

## Selected-instrument wiring

Market AI Copilot now builds evidence from the currently displayed live snapshot when its instrument ID matches the selected instrument. Candles and technical analysis therefore follow the actual current selection. A component-level integration test switches between two fixture instruments and verifies that the Final Read state, source symbol, and scenario context update.

## Copy summary

My Analysis uses the same evidence builder and Final Read rules. The copied report includes the result, reason, next check, and evidence summary. A data-limited result explicitly reports insufficient evidence.

## Safety wording

The visible caution remains: “Decision-support information, not a trade instruction.” / “판단 보조 정보이며 거래 지시가 아닙니다.” The implementation does not add direct transaction directions, execution prices, loss/profit levels, or performance promises.

## Limitations

- Candidate score is only as complete as the currently connected candidate, news, and disclosure inputs.
- Bitcoin anchor and daily market caution affect Final Read only when those contexts are supplied.
- Mock and limited data keep confidence conservative.
- Support, resistance, averages, activity, and momentum are deterministic historical references, not forecasts.
- Scenario analysis remains a mock scenario framework.

## Deferred

- real generative AI commentary
- live macro/news reasoning
- personalized portfolio advice
- actual trade-signal service
- broker or execution integration
- backend, authentication, payment, and database systems
