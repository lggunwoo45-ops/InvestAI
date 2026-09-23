# Sprint 10.8.1 — Action Readiness Layer Foundation

## What was added

My Analysis includes a deterministic Action Readiness plan between the selected instrument header and the analysis result. It translates existing evidence conditions into a review status, rationale, conditions, and next checks. It does not execute, recommend, price, or stage an order.

## Safety repair after external review

The pre-merge safety review identified two presentation risks in the original implementation: a five-step percentage zone ladder could resemble an execution plan, and review intent could change the action status. Both were removed.

- The plan no longer contains or renders review zones, percentage-distance ladders, entry levels, invalidation levels, or profit-protection levels.
- Review intent changes only the existing review-checklist wording. It never changes Action Readiness status, clarity, rationale, conditions, or next checks.
- Mock/demo data is limited to Decision pending. Unavailable data is also Decision pending, and limited data remains Waiting.
- Stocks remain Decision pending until reliable stock data is connected.
- The former Strength label is presented as Signal clarity / 판단 명확도 and explicitly states that it is not confidence or expected return.

## Status model and rules

The typed model supports Decision pending, Waiting, Watch zone, Conditional approach, Chase caution, and Sharp-drop rebound caution with low, medium, or high rule clarity.

- Missing or unavailable core data becomes Decision pending.
- Mock/demo crypto and stock data becomes Decision pending.
- Limited live-source context remains Waiting.
- Live crypto with a deterministic candidate can become Watch zone or Conditional approach when movement is not extreme.
- Strong live crypto movement becomes Chase caution or Sharp-drop rebound caution.
- Average price, personal notes, and review intent never participate in status calculation.

## Simple and Expert modes

Simple Mode leads with Current action status. Expert Mode leads with Action readiness. Both modes show a neutral summary, why the status was selected, conditions to check, conditions to avoid, next checks, Signal clarity, and the rule-based non-instruction disclaimer. Neither mode displays an execution-like zone ladder.

## Language and safety

Statuses, conditions, clarity labels, explanations, and caveats are available in English and Korean. The wording avoids direct recommendations, exact order-price signals, staged-entry framing, personalized calculations, probability claims, and execution behavior.

## Tests

Tests cover plan presence, mock/demo and unavailable-data gating, candidate-based live states, strong-movement cautions, intent-independent status calculation, intent-specific checklist wording, zone-ladder absence, bilingual clarity copy, UI rendering, and forbidden-label absence.

## Deferred

- Real AI and real stock providers
- Direct transaction signals and exact order prices
- Filings, disclosures, earnings, fundamentals, export or sales data, and analyst ratings
- Portfolio storage and backend synchronization
- Authentication, payment, and subscription services
- Trading and order execution
- Regulated investment advisory workflows
