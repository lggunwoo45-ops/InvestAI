# Sprint 9.8 — Candidate Horizon System + Planning Zones

## Outcome

Crypto Watch Candidates now supports Short-term, Swing, and Long-term analysis horizons. Changing a tab recalculates the same normalized market inputs with a deterministic horizon profile, updates the candidate ordering and score breakdown, and generates horizon-specific planning reference bands. No model, random value, network request, price prediction, or order action was added.

## Horizon and review cadence model

- Short-term: daily or intraday review, emphasizing momentum, volume, volatility, and immediate news. Extreme movement receives the strongest penalty.
- Swing: review every two to three days, balancing trend, continuing volume, news context, pullback quality, and moderate risk penalties.
- Long-term: weekly review, emphasizing liquidity, BTC/ETH major-asset context, stability, and thesis risk while reducing sensitivity to short-term movement.

Real-time data may update evidence and scores. The UI explicitly advises users to review the list on its selected horizon rather than chase every tick.

## Planning reference model

When a valid current price exists, simple percentage bands produce an interest area, second interest area, target observation area, and invalidation/risk area. Short-term bands are narrow, Swing bands are moderate, and Long-term bands are broad. When price is missing, the engine produces text-only placeholders instead of inventing a number.

Every band is labelled rule-based and approximate. These values are not entries, exits, stop instructions, forecasts, probabilities, or recommendations. Users must inspect current market structure and make the final decision.

## Candidate lifecycle

The browser stores the latest score snapshot under `market-copilot.cryptoCandidateSnapshot.v1`, keyed by instrument and horizon. A candidate is New without a prior snapshot, Maintained within five points, Strengthened after an increase of at least six, and Weakened after a decrease of at least six. Missing evidence or a larger risk deduction produces Review needed. Invalid snapshot storage is removed safely.

Snapshots are local-only and have no backend, account, analytics, telemetry, or synchronization path. They compare review snapshots; they are not a performance record or learning model.

## Sprint 9.7 compatibility

Existing review status and local notes remain keyed by instrument so previously stored feedback continues to load without migration. The UI clearly states that this feedback is shared across horizons. Review feedback never enters the candidate scoring engine.

## UI and language

English and Korean labels cover horizon tabs, cadence guidance, lifecycle states, all planning areas, reference-only language, and real-time review guidance. Existing review filters, notes, reset, evidence detail, news provenance, and Market navigation remain intact.

## Deferred

Real AI, actual recommendations, Paid Sector Picks, sector candidates, production news backend, news ranking, portfolio-aware analysis, backtesting, probabilities, true entry/target calculations, trading, accounts, databases, payments, cloud sync, and telemetry remain deferred.

Future news translation must preserve the original headline and source link, generate a separate clearly labelled Korean summary, and include explicit API and cost controls. No translation model is connected in Sprint 9.8.
