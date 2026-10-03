# Sprint 10.23 — Automatic Technical Levels and Chart Overlay Foundation

## Scope

Sprint 10.23 defines a deterministic technical-level foundation from the product's existing normalized candle data. It is a historical chart-review aid only. It does not add a market-data provider, call an exchange directly, create candles to fill gaps, rank candidates, predict price movement, or produce transaction instructions.

## Data boundary

- The feature reuses the normalized `MarketDataService` candle pipeline with the `1D` timeframe.
- Technical-level consumers do not choose a provider or exchange adapter and do not make a second market-data request outside that service boundary.
- The calculator accepts the candles already returned by the pipeline, ignores invalid candle values, orders valid observations deterministically, and does not synthesize missing history.
- Provider mode and data quality remain visible product context. This sprint introduces no new API, proxy, provider, secret, or backend dependency.

## Deterministic calculation contract

The calculation is a pure transformation of an instrument, its valid daily candles, the selected language, and the existing data-quality state. The same input produces the same output, and the calculation itself has no network, storage, clock, random, AI, or personal-account dependency.

The bounded output consists of:

- up to two support references below the current comparison price;
- up to two resistance references above the current comparison price;
- simple moving averages for 5, 20, and 60 valid closes, with each average present only when its own required history is available;
- Fibonacci references at `0.382`, `0.5`, and `0.618` across the observed valid high-low range; and
- a typed chart-overlay line contract carrying the label, price, kind, strength, line style, and default-visibility intent.

Support and resistance are selected only from observed candle lows, highs, and local pivots. Duplicate or near-duplicate observations are collapsed before the two-per-side cap is applied. Moving averages and Fibonacci values remain mathematical summaries of loaded history; they are not forecasts or confidence measures.

## Unavailable states

The feature must return an explicit unavailable result instead of precise-looking levels when the candle history is insufficient, the current comparison price is invalid, the observed high-low range cannot support calculation, or the data source is unavailable. An unavailable result contains no support, resistance, moving-average, Fibonacci, or overlay lines.

No missing candle is replaced, interpolated, or fabricated to make an unavailable result appear complete. A shorter valid history may expose only those moving averages whose individual periods are satisfied.

## UI integration

- **AI Analysis:** the selected-candidate inspector now shows a compact technical-level presentation after Practical Decision and Review Ranges. Selecting a different saved candidate updates this context without changing the saved list or its order.
- **My Analysis — Simple Mode:** the presentation prioritizes the first available support, the first available resistance, and a concise moving-average context.
- **My Analysis — Expert Mode:** the presentation exposes the bounded support and resistance set, available 5/20/60 moving averages, Fibonacci references, source basis, strength labels, and distance from the current comparison price.
- **My Analysis report copy:** when chart structure is available, the copyable summary includes its summary, first support, first resistance, and the technical-level safety note. Unavailable data never produces precise-looking prices.
- Loading, mock, limited, and unavailable states must stay explicit in both workspaces. Page integration must keep the existing candidate order, Practical Decision, Review Ranges, review score, snapshot, and safety behavior unchanged.

## Chart-overlay boundary

The chart work in this sprint is a planned legend and overlay-line contract only. It allows a future chart renderer to consume stable, typed line metadata without repeating the technical calculation.

Actual horizontal-line drawing, moving-average series, Fibonacci drawing, hover interaction, visibility toggles, and lifecycle synchronization in TradingView or `lightweight-charts` are explicitly deferred. A legend entry must not imply that a line has already been drawn on a live chart.

## Safety language

Technical levels are labelled as historical, rule-based review references. They are not order prices, entry or exit instructions, personalized recommendations, future-price predictions, return probabilities, or guarantees. Terms such as support, resistance, rebound watch, and breakdown check describe what a user may review in observed data; they do not direct a trade.

Mock or limited data must retain its existing quality warning. The feature does not consume average price, holdings, personal notes, account data, or portfolio data when calculating levels.

## Test boundary

Automated coverage is expected to use fixed local candle fixtures and mocked service states only. Tests must remain network-free and must not call real exchanges, DART, RSS, AI, account, payment, broker, or backend services.

Coverage should lock:

- deterministic output and input immutability;
- the two-per-side support and resistance cap;
- 5/20/60 moving-average availability by candle count;
- exact `0.382`, `0.5`, and `0.618` Fibonacci contracts;
- invalid, duplicate, out-of-order, insufficient-history, flat-range, and unavailable-data behavior;
- compact versus Simple/Expert presentation boundaries; and
- legend-only overlay metadata and safe wording.

## Validation

Final validation from `frontend/`:

- `npm run test:proxy` — passed, 10/10 tests.
- `npm run lint` — passed with the one pre-existing React Compiler compatibility warning in `MarketExplorer.tsx`.
- `npm run typecheck` — passed with the project-reference build (`tsc --build --force`).
- `npm run test -- --maxWorkers=1` — passed, 102 files and 441 tests.
- `npm run build` — passed, 313 modules transformed.
- `git diff --check` — passed.

All technical-level unit and integration tests use deterministic local fixtures or a mocked `MarketDataService` subscription. No test requires a live exchange, RSS, DART, AI, account, broker, or backend connection.

## Deferred

- TradingView or `lightweight-charts` overlay drawing and interaction
- Intraday or selectable technical-analysis timeframes
- New market-data APIs, providers, proxies, or backend persistence
- Candle-gap interpolation or generated replacement history
- AI interpretation, probability, forecasting, recommendation, or personalized advice
- Trading, orders, broker integration, alerts, and automation
