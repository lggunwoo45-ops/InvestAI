# Sprint 10.9 — My Analysis Action Brief and Status Guide

## What was added

My Analysis now places a concise Action Brief above Action Readiness for every selected instrument. It summarizes the current state, plain-language meaning, classification reason, next review item, weakening condition, and data state without adding a new calculation path.

## Action Brief behavior

The brief consumes the existing `MyAnalysisResult` and `actionReadiness` contract. It does not reproduce status rules in the component. Simple Mode gives the brief visual priority; Expert Mode keeps it compact and adds a reminder to inspect the rule basis below.

## Status Guide behavior

An expandable bilingual guide explains all six Action Readiness states. Each entry describes observation or confirmation needs without transaction directions, order levels, outcome claims, or urgency styling.

## Data confidence copy

The brief identifies Live data, Mock/demo data, Limited data, or Data unavailable. Live copy states that loaded public data is not sufficient for investment advice. Limited and unavailable states explain that missing key data keeps the status conservative. Evidence and missing-evidence counts come from the existing result.

## Mock/demo workflow preview

Mock/demo results remain Decision pending. The brief describes them as a workflow preview showing how analysis will be organized after reliable data is connected. It does not expose percentage ladders or action prices.

## Simple Mode layout

After the instrument header, Simple Mode now flows through Action Brief, Action Readiness, Current Read, What stands out, Risks and limits, Next checks, optional personal context, and the safety footer.

## Expert Mode layout

Expert Mode keeps Action Brief and Action Readiness at the top, then presents the review summary, evidence board, missing evidence, review checklist, and user inputs. The brief points to the existing typed rule basis without adding navigation or duplicating engine rules.

## Korean and English coverage

Brief labels, data-state descriptions, evidence counts, rule-basis hint, and all glossary entries are available in Korean and English.

## Safety wording

The brief uses one item from existing conditions for the next review and weakening summaries. It does not add direct transaction language, exact action prices, percentage zones, model claims, or fabricated evidence. The existing safety footer remains visible after the result and optional personal context.

## Tests

Tests cover selected-instrument rendering, current state, data state, all status-guide entries, mock workflow copy, Simple ordering, Expert rule-basis hint, bilingual labels, unsafe-label absence, percentage-ladder absence, and existing My Analysis behavior. All tests remain deterministic and offline.

## Deferred

- Real AI
- Real stock providers
- Direct transaction signals and exact order prices
- Percentage zone ladders
- Filings and disclosures
- Earnings and fundamentals
- Export and sales data
- Analyst ratings
- Portfolio storage and backend synchronization
- Authentication, payment, and subscriptions
- Trading and order execution
- Regulated advisory workflows
