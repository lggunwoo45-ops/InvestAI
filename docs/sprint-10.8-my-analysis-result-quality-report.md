# Sprint 10.8 — My Analysis Result Quality

## What improved

`/my-analysis` now turns the same safe, existing catalog and news state into more situation-specific review text. The engine remains pure and deterministic: it performs no fetch, AI inference, valuation, prediction, or trade action.

## Analysis profile behavior

An internal profile classifies asset kind, recent movement, available volume state, data trust, news relationship, candidate presence, and review risk. Movement uses the instrument's actual 24-hour percentage. Raw volume is only marked available, low, or unknown because incomparable venue units do not justify a fabricated “high volume” conclusion.

## Crypto result quality

Crypto current reads distinguish strong upward, moderate upward, flat, moderate downward, strong downward, and unknown movement. “What stands out” combines the movement band with deterministic candidate presence and explicitly related, market-only, or missing news context. Risk copy prioritizes demo or limited data, large-movement reversibility, missing context where space permits, and the user's own decision criteria.

## Stock result quality

Mock and limited stock results are labelled as structure previews. They explicitly state that real disclosures, earnings, and fundamentals are disconnected and that current movement is demo context. Future live stock market data would not imply fundamentals that are not connected.

## Simple and Expert modes

Both modes prominently render a concise `currentRead`. Simple Mode keeps four short areas: current facts, what stands out, risks and limits, and intent-sensitive next checks. Expert evidence now includes a typed level, detail, source, and a `reviewMeaning` explaining why the item matters without turning it into a judgment.

## Intent and missing data

Each of the five review intents changes only the first next-check line. The existing non-advice notice remains visible. Non-finite price, movement, or volume values create individual Missing evidence records; they never produce an Available record or a fabricated value.

## Language and safety

All new current reads, profile-driven observations, risk cautions, evidence meanings, missing-data messages, and intent checks are provided in English and Korean. No recommendation, prediction, entry, exit, target, stop, profit, valuation, or order-execution label was introduced.

## Tests

Tests cover strong positive, strong negative, flat, moderate, mock-stock, and unavailable-data outcomes; stock evidence boundaries; distinct intent checks; evidence review meanings; Korean output; unsafe headline isolation; and forbidden recommendation wording. Page tests confirm the current read and Expert explanations are rendered.

## Deferred

- Real AI and external model calls
- Real stock providers
- Filings, disclosures, earnings, fundamentals, export or sales data, and analyst ratings
- Portfolio storage and backend synchronization
- Authentication, payment, and subscription services
- Trading and order execution
- Personalized investment advice
