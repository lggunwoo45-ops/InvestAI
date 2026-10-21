# Analysis preparation status

The crypto analysis Summary previously showed one generic loading message. Users could not distinguish candle-history loading, waiting for a live quote, or a data limitation without opening Evidence.

## Behavior

- Summary, including Already holding, shows a readiness bar and elapsed waiting time. Each usable 1-hour, 4-hour and daily series contributes one third: 0%, 33%, 67%, 100%. Time passing never increases the percentage.
- Readiness uses the existing engine's freshness, closed-bar count and continuity checks, plus a valid price. A failed, stale, missing, insufficient or mock series is not counted as ready. Only all three usable timeframes and an available decision can show 100%.
- Each unfinished timeframe explains whether it is fetching history, connecting live quotes, reconnecting, awaiting fresh quotes, missing history, or missing intervals.
- At 15 seconds of continuous waiting, show a slow-preparation notice. At 45 seconds, show a delayed-response notice and a clearly labeled page-reload action. These are UI thresholds, not request timeouts; existing automatic connection attempts continue.
- The existing two-timeframe analysis remains visible as soon as it is available. Background recovery does not hide a still-valid partial result. Mock mode is explicitly labeled and has no readiness percentage.
- On completion or navigation the waiting timer stops. A new instrument, data mode or waiting episode gets a new clock. The progress bar and status are accessible; the spinner respects reduced-motion preferences.

## Validation

- Automated checks cover holding-mode progress, history-versus-quote waiting, partial results, time-independent percentages, 15/45-second thresholds, recovery, timer cleanup, insufficient history and instrument/mock transitions.
- The existing analysis-route test checks visible progress and retains detailed references and personal-context restoration.
- Local browser check uses actual Upbit BTC data and Already holding, confirming 100% readiness and the existing result together.

## Boundaries

This changes status visibility, not the network provider, analysis rules or loading speed. The percentage is the share of currently usable timeframes, not download bytes, remaining time or confidence. It can decrease if data becomes stale. A delayed response does not prove that a request is permanently stuck. No holdings, saved scenarios, paid service settings or PC development configuration are changed.
