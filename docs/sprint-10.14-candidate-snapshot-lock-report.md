# Sprint 10.14 — Candidate Snapshot Lock

## Outcome

The AI Analysis candidate workspace now starts from a stable local snapshot instead of presenting a continuously changing ordered list as if it were a current recommendation. A snapshot records up to five candidates, their order, captured market basis, qualitative observation stage, Action Readiness state, signal clarity, rule basis, data quality, news state, and disclosure metadata. It contains no personal note, personal basis price, future action price, or Watch Score.

## Snapshot lifecycle

The first snapshot is created only after candidate data is ready. It remains unchanged across ordinary re-renders and market-value updates. A user must select **Refresh candidates / 후보 새로고침** to replace it. The UI states the capture time and explains that the record does not update automatically. Storage is runtime-validated, retains at most two snapshots, and treats records as expired after 24 hours.

## Freshness comparison

Freshness is deterministic and neutral: **Baseline held**, **Change check needed**, **Snapshot expired**, or **Current state unavailable**. The comparison uses only rule-basis values, qualitative observation stage, Action Readiness state, and data quality. Price movement and return thresholds do not decide freshness. Basis and current prices are shown only as historical context.

## Beginner stage repair

Beginner labels are now **Waiting / checking conditions**, **Observation start**, **Conditions forming**, and **Conditions clear** (with Korean equivalents). The clearest stage is reachable only when existing candidate evidence and related verified news evidence are both present. Mock or limited data remains conservatively gated.

## My Analysis handoff

Opening a snapshot item passes its snapshot and item identifiers to My Analysis. A valid, unexpired matching record initializes the in-session analysis baseline from its captured price, stage, status, and time. Missing, corrupted, mismatched, or expired records fall back to the normal current-data flow and show a neutral notice. Invalid or non-positive prices cannot create a baseline.

## Safety boundary

This release adds no real AI, provider, backend, account, payment, portfolio mutation, trading, order execution, or advice logic. Snapshot creation is a pure deterministic transformation with caller-supplied time and identifiers. Tests use local fixtures only and make no network requests.

## Deferred

- Server synchronization and account history
- Production stock and disclosure enrichment across the candidate list
- Real AI interpretation or personalized advice
- Trading, orders, execution, alerts, and automation
