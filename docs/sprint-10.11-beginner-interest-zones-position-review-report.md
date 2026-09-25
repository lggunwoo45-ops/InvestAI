# Sprint 10.11 — Beginner Interest Zones and Position Review

## What was added

`/my-analysis` now offers two explicitly selectable review perspectives: New interest review and Position review. Both reuse the existing deterministic `MyAnalysisResult`; no second analysis engine, provider, model, or execution path was introduced.

## Beginner Interest Zone

The beginner card maps existing Action Readiness and data quality to qualitative observation stages: Waiting / checking conditions, Observation start, Conditions forming, and Conditions clear. The clearest stage requires existing candidate evidence plus related verified news evidence; signal clarity alone cannot advance it. Caution states remain Movement expansion caution or Sharp-drop rebound caution. The card shows one meaning, one next check, one caution, and an explicit decision-support boundary without future action prices.

## Position Review

Without a basis price, Position review displays a compact helper. With a valid basis, it shows the user's basis price, current loaded price, historical difference and percentage, a qualitative position state, and an existing next check. A materially higher current value maps to Profit protection review, a nearby value to Baseline still valid, and a materially lower value to Invalidation basis review. Internal thresholds are not displayed as guidance.

## Basis-price handling

The existing optional average-price input is reused as the user's basis price. Its percentage is historical holding context, not a future zone. No future action price or transaction instruction is calculated. The basis remains user context and is not merged into market evidence.

## Analysis baseline lock

Selecting an instrument creates an in-memory snapshot containing capture time, loaded price, Action Readiness status, and beginner interest stage. The panel displays current price separately. Re-renders for the same instrument do not alter the snapshot; Refresh baseline explicitly replaces it with currently loaded values. Selecting another instrument remounts the snapshot through the instrument key. Nothing is persisted or sent to a backend.

## Review mode selector

The selector defaults to New interest review and does not change automatically when a basis price is entered. Simple Mode renders only the selected perspective. Expert Mode always shows Beginner Interest Zone and adds Position Review when a valid basis exists.

## Copy summary

New interest review copy includes interest stage, data confidence, current read, next check, and the safety line. Position review copy includes qualitative position state, basis price, current price, historical change, next check, and the safety line. Personal notes are never included. No future action price, unsafe label, telemetry, storage, or backend is used.

## Korean and English coverage

Both languages cover review modes, all interest stages, position states, baseline fields, refresh action, helper text, next checks, cautions, and decision-support notices.

## Safety wording

Muted presentation and qualitative language prevent the cards from reading as commands. No direct transaction signal, exact future order price, stop/take-profit level, return promise, or percentage zone ladder is present.

## Tests

Tests cover interest-stage mappings, mock-data gating, Korean labels, position helper and metrics, positive/negative basis states, baseline stability and refresh, selector integration, Simple/Expert visibility, copy-summary variants, personal-note exclusion, and existing My Analysis behavior.

## Deferred

- Real AI and real stock providers
- Direct transaction signals and exact future order prices
- Stop/take-profit prices and percentage zone ladders
- Filings, disclosures, earnings, fundamentals, export/sales data, and analyst ratings
- Portfolio storage and backend sync
- Accounts, authentication, payments, subscriptions, and entitlement
- Trading, order execution, and regulated advisory workflows
