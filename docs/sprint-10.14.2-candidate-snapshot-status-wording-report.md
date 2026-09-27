# Sprint 10.14.2 — Candidate Snapshot Status Wording Fix

## What was fixed

Candidate Snapshot cards no longer use one broad unavailable label for two different situations. Freshness now distinguishes a missing or invalid current price from an available current price whose current review basis cannot be compared with the saved snapshot.

## Why the status was split

The earlier Current state unavailable / 현재 상태 확인 불가 label could appear while a valid current price and change-since-basis value were visible. That made a review-basis gap look like a price-data failure. The new states describe the actual missing input without changing snapshot contents, ordering, or refresh behavior.

## Current price unavailable

Current price unavailable / 현재 가격 확인 불가 is used only when the current price is absent, non-finite, or non-positive. The card displays no invented price or change value.

## Current review basis unavailable

Current review basis unavailable / 현재 판단 근거 확인 불가 is used when a valid current price is available but the current rule basis, action status, or interest-stage comparison cannot be performed. The card keeps the current price and neutral Change since basis / 기준 이후 변화 reference visible and adds a concise explanation that the snapshot record could not be compared with a current review basis.

## Other freshness states

Snapshot expired / 기준 시점이 오래됨 remains the first freshness boundary after expiry. A valid comparison continues to produce Change check needed / 변화 확인 필요 when evidence state differs and Baseline held / 기준 유지 when it does not. Price direction does not decide any freshness state.

## Horizon visibility and refresh behavior

AI Analysis continues to render only one Interest candidate list for the selected Short-term, Swing, or Long-term horizon. The other horizons and the live calculation input are not rendered as extra lists. Refresh candidates remains the only action that creates or replaces the selected context's snapshot; no automatic refresh, replacement, re-ranking, or price-driven reordering was added.

## Safety wording

The patch adds no direct transaction instruction, order-price label, future action price, percentage zone ladder, performance framing, or profit/loss styling. My Analysis handoff behavior and the separation of personal average price and notes are unchanged.

## Tests added or updated

- Invalid, missing, zero, and unavailable current-price classification
- Available-price but unavailable-review-basis classification
- Exact English and Korean labels and helper text
- Absence of the former broad unavailable wording when current price is visible
- Expired, changed, and held status labels
- One selected-horizon list, no separate live list, visible manual refresh, and stable pre-refresh ordering
- Forbidden action and order-price wording regression checks

Tests remain fixture-based and do not call real DART, RSS, AI, market, backend, account, payment, or database services.

## Deferred

- Claude external review
- Position-review threshold redesign
- Server-side snapshot synchronization and multi-device history
- Alerts, push notifications, and performance tracking
- Automatic re-ranking
- Real AI and real stock providers
- Trading and order execution
- Backend, authentication, payment, and database systems
