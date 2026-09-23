# Sprint 10.6.1 — My Analysis UX / Risk Wording Polish

## What changed

This follow-up hardens `/my-analysis` without changing its data-provider or safety boundaries.

- Simple Mode no longer imports reassurance-like candidate penalty wording into Risks and limits.
- Risk items have a stable priority: data-quality caution, large-movement caution, then the general downside and decision-criteria reminder.
- Simple Mode shows the actual 24-hour movement, the catalog-derived data quality, and whether explicitly related news is missing.
- A non-blocking catalog limitation panel appears when any venue catalog fails. Instruments from catalogs that did load remain searchable.
- A missing URL-selected instrument is described as unavailable in the loaded catalogs rather than definitively unsupported.
- Expert evidence and missing evidence remain typed. Checklist rendering now uses the named `reviewChecklist` property and section IDs instead of array position.
- All five review intents produce distinct checklist wording only. The page explicitly says intent does not create personal investment advice.

## English and Korean coverage

Catalog limitations, unavailable instruments, data-quality context, volatility cautions, intent notes, and all five intent-specific checklist lines are available in English and Korean.

## Tests

Tests cover normal and large positive/negative movement, mock plus large movement, removal of reassurance-like English and Korean wording, preservation of the general risk reminder, all five distinct intents, named section IDs, catalog error visibility, safe unavailable messaging, and continued search across loaded catalogs.

## Deferred

- Real AI and external model calls
- Real stock providers
- Filings and disclosures
- Earnings and fundamentals
- Export and sales data
- Analyst ratings
- Portfolio storage and backend synchronization
- Authentication, payment, and subscription services
- Trading and order execution
- Catalog retry controls; existing provider refresh behavior remains unchanged
