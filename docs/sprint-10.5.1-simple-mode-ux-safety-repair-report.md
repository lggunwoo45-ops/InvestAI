# Sprint 10.5.1 — Simple Mode UX Safety Repair

## What was fixed

Simple Mode now behaves as the beginner side of a Simple/Expert viewing-mode switch. Its default cards are shorter, avoid ranked-pick presentation, separate crypto from the stock beta preview, and surface crypto catalog failures instead of allowing stock previews to appear as replacement primary candidates.

## Why absolute prices were removed

The former fixed-percentage calculations were rendered as exact KRW or quote-currency prices. Even with cautious labels, that presentation could resemble a precise entry, risk, and profit plan. Simple Mode now renders only approximate percentage distances from the current price and explicitly states that they are fixed-percentage distances, not calculated support or resistance. Expert Mode behavior is unchanged.

## Mode switcher and sidebar

- `/simple` and `/ai-analysis` share a reusable bilingual `ModeSwitcher`.
- The active view uses `aria-current="page"`.
- `/simple` remains lazy-loaded and directly addressable.
- Simple Mode was removed from primary sidebar navigation so it reads as a viewing mode rather than another workspace product area.

## Attention bands

Simple Mode no longer displays rank numbers or large numeric Watch Scores. The internal score is mapped only for presentation:

- 70 and above: High attention
- 50–69: Medium attention
- Below 50: Low attention

The UI explains that attention is a sorting aid, not a probability. The expert Watch Score calculation is unchanged.

## Crypto and stock separation

- Crypto Watch Candidates shows up to three crypto candidates.
- Stock Beta Preview separately shows up to one Korea and one US candidate.
- Mock stock movement is never promoted as a positive beginner-facing reason.
- Mock, limited, and unavailable stock data still produces no numeric planning level.

## Crypto error behavior and data quality

Crypto quality comes from the returned catalog source, not the requested mode. Missing catalogs default to limited or unavailable rather than live. A LIVE catalog failure displays the provider error, a retry action, and an optional MOCK switch. The stock beta preview remains visibly separate and does not replace the failed crypto section.

## Safety wording

The default card shows one reason and one caution. Detailed checks and percentage planning explanations are behind a disclosure. English and Korean labels use observation, attention, check, caution, and fixed-percentage language. Unsafe trading labels are structurally excluded from headings, fields, and actions.

## Tests

Tests cover the mode switcher, hidden sidebar entry, retained `/simple` route, attention bands, absence of ranks and numeric score presentation, percentage-only planning, absence of absolute quote prices, stock planning blocking, crypto failure visibility, separate stock preview, Korean labels, and unsafe field-label exclusions.

## Deferred

- Candidate-specific detail route
- Personalized risk profile
- Real AI and real stock provider
- Stock numeric planning levels
- Account and backend feedback synchronization
- Payment and subscription
- Trading and order execution
- User portfolio integration
