# Sprint 10.7 — My Analysis Usability / Search Flow Polish

## What was added

`/my-analysis` now guides the user from an honest empty state through catalog-only search, asset filtering, instrument selection, and either a concise Simple review or the existing detailed Expert evidence board. No provider, AI, or trading behavior changed.

## Empty state and search

- The empty state explains what to search, what the workspace reviews, and that it does not provide buy or sell signals.
- Three short guidance cards cover search, review intent, and Simple or Expert results.
- Search results use plain accessible buttons and are grouped as Crypto, Korea Stocks, and US Stocks.
- All, Crypto, Korea, and US filters operate only on already loaded catalog results.
- Each result shows its symbol, available names, venue, and Live, Mock, or Limited source quality. Results remain capped at 30 with a truncation note when needed.

## Selected instrument and analysis readability

- The selected header makes symbol, names, venue, asset type, current value, 24-hour movement, and data quality visible together.
- Simple Mode presents the current summary, notable evidence, risks and limits, and next checks as four concise cards with at most three bullets each.
- Expert Mode keeps Available, Context, Demo, and Missing badges while making evidence type and source lines easier to scan.
- A successfully resolved `instrumentId` query displays an “Opened from Market workspace” context line. Missing instruments keep the safe catalog-boundary message and search remains available.

## Personal context and review intent

Average price and notes sit inside an explicitly optional personal-context section. They remain separate from market evidence and are not used to calculate gain, loss, or position guidance. Review intent is described as changing checklist wording only.

## Language and safety

New empty-state, filter, catalog, data-quality, Market-flow, personal-context, and analysis labels are available in English and Korean. No recommendation, entry, exit, target, stop, profit, or execution label was added.

## Tests

Page tests cover the guided empty state, all asset filters, direct query selection, data-quality visibility, Market context, optional personal context, intent explanation, Simple next checks, Expert badges/type/source lines, bilingual copy, catalog failures, safe unavailable handling, and unsafe-label absence. Existing route and provider-isolation suites remain in place.

## Deferred

- Real AI and external model calls
- Real stock providers
- Filings, disclosures, earnings, fundamentals, export or sales data, and analyst ratings
- Portfolio storage and backend synchronization
- Authentication, payment, and subscription services
- Trading and order execution
- Personalized investment advice
