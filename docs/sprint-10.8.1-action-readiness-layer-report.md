# Sprint 10.8.1 — Action Readiness Layer Foundation

## What was added

My Analysis now includes a deterministic Action Readiness plan between the selected instrument header and the analysis result. It translates existing evidence conditions into a review status, rationale, conditions, next checks, and safe percentage-distance zones. It does not execute, recommend, or price an order.

## Status model and rules

The typed model supports Decision pending, Waiting, Watch zone, Conditional approach, Staged approach review, Chase caution, Sharp-drop rebound caution, Invalidation check, and Profit protection review with low, medium, or high rule strength.

- Missing core data and mock stock workflows remain Decision pending.
- Flat crypto with a deterministic candidate becomes Watch zone.
- Moderate crypto with a candidate can become Conditional approach.
- Strong upward and downward movement become Chase caution and Sharp-drop rebound caution.
- Holding intent changes adverse movement to Invalidation check and strong positive movement to Profit protection review.
- Average price and personal notes never participate in status calculation.

## Review zones

Crypto with available core data receives five fixed percentage-distance references: 1.5%, 3%, 5%, and 7% below current price plus 3%–6% above current price for protection review. No absolute KRW, USD, or USDT zone price is calculated or displayed. Stock zones remain disabled until reliable stock data is connected.

## Simple and Expert modes

Simple Mode leads with Current action status, followed by the current read, observations, cautions, next checks, optional personal context, and safety notes. Expert Mode leads with Action readiness and rule basis, then review summary, evidence, missing evidence, checklist, and user inputs. Both modes show conditions to check, conditions to avoid, and the rule-based non-instruction disclaimer.

## Language and safety

All statuses, conditions, zones, strength labels, explanations, and caveats are available in English and Korean. No direct recommendation, exact order-price signal, execution behavior, or personalized calculation was added.

## Tests

Tests cover plan presence, mock-stock pending state, flat and moderate candidate states, strong upward and downward cautions, holding-intent invalidation and protection reviews, percentage-only crypto zones, disabled stock zones, UI rendering in both modes, bilingual copy, and forbidden-label absence.

## Deferred

- Real AI and real stock providers
- Direct transaction signals and exact order prices
- Filings, disclosures, earnings, fundamentals, export or sales data, and analyst ratings
- Portfolio storage and backend synchronization
- Authentication, payment, and subscription services
- Trading and order execution
- Regulated investment advisory workflows
