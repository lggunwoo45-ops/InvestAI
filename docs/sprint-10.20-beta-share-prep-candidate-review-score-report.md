# Sprint 10.20 — Beta Share Prep and Candidate Review Score

## Outcome

Sprint 10.20 adds a deterministic candidate review score to the fixed daily candidate snapshot and My Analysis report. The score helps a reviewer scan how much current evidence is available; it does not change candidate selection, candidate order, Practical Decision, Review Ranges, or market-provider behavior.

## Review score contract

- Output is an integer from 0 to 100, or `unavailable` when a usable basis is missing.
- Inputs are limited to data quality, Practical Decision state, Signal clarity, Review Range availability, freshness, loaded/missing evidence counts, news evidence, and disclosure evidence.
- User notes, average price, future performance, returns, and execution information are excluded from the model contract.
- Mock/demo data is capped at 40.
- Expired snapshots are capped at 60.
- Missing current review basis is capped at 50.
- Expanded-movement and post-drop caution states are capped at 70.
- A missing price, unavailable data quality, or no loaded evidence produces `unavailable` instead of an invented number.

## UI integration

- Candidate snapshot cards display a compact, muted `Review score` / `검토 점수` badge.
- The snapshot panel explains what the score means and explicitly says it is not a profit probability or buy signal.
- My Analysis displays the same score near the report actions.
- The copied plain-text report includes the score and a dedicated non-profit-probability/non-instruction caution.
- Score labels do not use rank, recommended, buy, sell, target, stop, or expected-return language.

## Preserved behavior

- Daily and horizon snapshot items remain fixed and ordered by saved `order` until manual refresh.
- The score does not sort, filter, promote, or remove candidates.
- Practical Decision, Review Ranges, News, DART, providers, and candidate engines are unchanged.
- Personal notes and average price stay out of the score and remain excluded from the interest-review copy summary.

## Beta-share preparation

`beta-share-demo-script.md` provides a bounded five-minute walkthrough, required safety wording, data-state checks, and stop conditions for internal beta sharing. It authorizes neither deployment nor external publication.

## Known limits

- The score is a transparent deterministic heuristic, not a calibrated probability or real AI output.
- Stock data remains mock/demo where the existing provider labels say so.
- Snapshot freshness and evidence availability can reduce or disable the score.
- A production policy, legal review, telemetry, accounts, backend persistence, and real AI remain outside this sprint.

## Validation scope

Automated tests cover clamping, conservative caps, unavailable states, bilingual badge output, snapshot order preservation, safe explanatory copy, and copied-report output. Browser automation, EXE execution, deployment, push, and merge are intentionally excluded by the sprint security boundary.
