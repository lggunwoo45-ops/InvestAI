# Sprint 9.2 — News Filter UX and Proxy Design

## Delivered

- Reorganized the News Center controls into clearly labeled Search and Topic groups.
- Added an active-filter summary for search, topic, market, sentiment, importance, and selected symbol.
- Added individually removable filter chips and one explicit Clear all action.
- Kept result count announcements, combined filtering, route-provided context, provider switching, and mock/RSS provenance unchanged.
- Added English and Korean labels for every new control.
- Documented the proposed News Backend Proxy architecture, frontend contract, provider boundary, cache/freshness rules, partial failures, security controls, observability, and deterministic test plan.

## Before and after

Previously, filter state was distributed between category tabs, three selects, search, and the selected-symbol toggle. Users could not see the complete filter combination or reset it in one action. Sprint 9.2 makes every non-default constraint visible in a compact summary. Removing a chip changes only that constraint; Clear all returns the News Center to unrestricted coverage.

## Scope boundary

No backend, proxy, API endpoint, network source, provider credential, scraping, paid feed, AI analysis, trading, authentication, or database was implemented. The existing experimental RSS and mock-provider behavior is preserved. The proxy document is an architecture proposal for a later reviewed sprint, not a production claim.

## Validation

Tests cover hidden/visible filter summaries, individual removal, complete reset, and the existing combined-filter empty state. Final lint, typecheck, test, and production-build results are reported with the local Sprint 9.2 commit.

