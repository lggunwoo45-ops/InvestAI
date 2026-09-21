# Sprint 10.5 — Simple Mode / Beginner Candidate View

## Added

- A lazy-loaded `/simple` route and bilingual **Simple / 간편모드** sidebar entry.
- A beginner-oriented page that answers what to watch, why it matters, what risks remain, which price zones are review references, and where detailed evidence lives.
- A reusable `SimpleCandidateCard` with local Watching and Dismissed feedback actions.
- A pure, deterministic simple-candidate adapter over the existing crypto and stock candidate results.
- A pure crypto planning-reference engine using current catalog prices and horizon-specific percentage spacing.
- Bidirectional navigation between Simple Mode and the existing AI Analysis expert workspace.

## Candidate model and engine

`SimpleCandidate` keeps the internal instrument identity, source candidate identity, asset and region context, Watch Score, horizon, data-quality boundary, short reason, good points, risk points, and a structured planning reference. The engine performs no fetch, AI inference, trading action, or random selection. It never creates a candidate without a corresponding catalog instrument.

The default result count is five. Existing crypto candidates lead the list, while the highest available Korea and US stock candidates each receive one review slot so the early-beta boundary is visible. Any remaining capacity is filled deterministically from the existing candidates. Empty source data produces an honest empty state.

## Crypto planning references

When a finite positive current price exists, Short, Swing, and Long profiles generate three observation prices, a risk reference, and a profit-taking reference range. Existing market price formatting preserves KRW, USD, USDT, BTC, and other quote formats. These values are explicitly labelled as rule-based planning references, not instructions.

## Stock planning boundary

Mock, limited, and unavailable stock candidates never receive numeric planning levels. The card explains that real stock data is not connected. The current stock candidate workflow, data-quality label, reason, evidence summary, risks, and expert-detail link remain visible.

## Safety and language coverage

English and Korean copy states that the screen is for planning and review, Watch Score is not probability, observation prices are not action instructions, risk references are not stop-loss instructions, and reference ranges are not guaranteed targets. The user's final decision remains explicit and visible.

## Deferred

- Real AI and real stock provider
- Numeric stock planning levels until reliable live data is connected
- Account and backend feedback synchronization
- Payment and subscription
- Trading and order execution
- Personalized risk profile
- User portfolio integration

## Validation boundary

Automated tests cover routing, navigation, bilingual beginner and safety copy, deterministic selection, crypto reference generation, stock numeric-level blocking, expert links, and prohibited recommendation phrases. Browser walkthrough remains a user-run manual validation step.
