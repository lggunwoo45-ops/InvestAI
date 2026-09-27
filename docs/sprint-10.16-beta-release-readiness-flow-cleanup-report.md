# Sprint 10.16 — Beta Release Readiness and Product Flow Cleanup

## Outcome

Market Copilot now presents one clearer beta path without adding investment logic. Key pages share a compact beta boundary, the Demo page explains the five-step user flow, and primary navigation emphasizes Dashboard, Market, AI Analysis, My Analysis, News, and Demo. Existing secondary routes remain available for compatibility but are no longer promoted as the main beta journey.

## Beta banner

The shared App Shell renders one compact bilingual Market Copilot Beta banner on Dashboard, Market, AI Analysis, My Analysis, News, and Demo. It describes the product as a decision-support review tool and states that trade instructions, automated trading, and profit guarantees are not provided. Central route handling avoids separate page implementations and duplicate banners.

## Getting Started flow

Demo now leads with a five-step Getting Started / 처음 사용 흐름 section:

1. Choose Short, Swing, or Long in AI Analysis.
2. Review the fixed interest candidate list.
3. Open a candidate in My Analysis.
4. Read the current decision and review ranges.
5. Optionally enter a recorded price for holding-basis context.

Direct CTAs open AI Analysis and My Analysis. The flow reuses existing routes and behavior.

## Navigation cleanup

Primary navigation now contains the six user-facing beta destinations only: Dashboard, Market, AI Analysis, My Analysis, News, and Demo. Simple Mode remains a global display setting rather than a separate primary item. Trading and older supporting workspaces are not promoted in the sidebar, but their routes were not removed so existing deep links and regression tests continue to work.

## Safety-text reduction

The Practical Decision Card uses one compact shared decision-support boundary. Review Ranges use one compact non-order boundary instead of repeating both model and component cautions. Candidate Snapshot cards suppress per-card copies of those lines and show one list-level safety line. The saved-record disclaimer remains separate because it explains snapshot timing and manual refresh rather than legal scope.

## Beta limitations and readiness

Demo includes a collapsible Not included in this beta panel covering automated trading, execution, full live stock integration, real AI summarization, guarantees, portfolio storage, payments, and account sync. An internal-facing Beta readiness checklist distinguishes available review features, optionally configured DART/news connections, and intentionally disabled AI, trading, payment, and authentication capabilities.

## Empty and missing states

- A missing candidate snapshot explains that Refresh candidates creates the first fixed list.
- Expired snapshots explain that the saved list remains usable as historical context and that refresh creates a current record.
- Review-range unavailability identifies missing live market data, confirms the rest of analysis remains usable, and suggests checking data mode or source.
- My Analysis explains live, mock, limited, and unavailable data quality, including what still works.
- News provider failures avoid raw transport/CORS guidance and explain that clearly labelled demo news remains available, with Mock mode or the optional local connection as the next action.
- Existing DART missing-key and mapping states already explain what is missing and that the rest of the app remains available, so their behavior is preserved.

## Tests

New and updated deterministic tests cover the beta banner on all six key routes, Getting Started steps and CTAs, limitations, readiness, six-item primary navigation, existing secondary-route compatibility, candidate empty-state guidance, one candidate-list safety line, review-range missing-state guidance, and existing Practical Decision, Review Range, snapshot, My Analysis, and major-route rendering.

Tests use fixtures or explicit mocks and do not call real DART, RSS, AI, account, payment, or backend services.

## Deferred

- Real AI
- Real stock providers
- Broker integration and trading/order execution
- Backend, authentication, payment, and database systems
- Portfolio storage
- Alerts and push notifications
- Mobile app packaging
- Compliance and legal review
- Paid release

