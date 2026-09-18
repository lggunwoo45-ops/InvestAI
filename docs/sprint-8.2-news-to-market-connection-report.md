# Sprint 8.2 — News to Market Connection

## Scope and provenance

- Added explicit News → symbol actions, expanded article details, combined News filters, compact instrument-related news in the AI Copilot, and Briefing → market-filtered News links.
- No real news source was connected. All headlines remain dated, illustrative scenarios from **InvestAI Demo Desk**, marked “Demo news / Mock data” (Korean: “모의 뉴스 / 데모 데이터”). They are not reports of current events.
- GitHub PR #9 is merged at `626f6750c0d16f8272b2891d7e19e1be2c287fb7`. `git fetch origin main` failed because github.com:443 was unavailable, but a read-only GitHub comparison found **no file differences** between that merge commit and the local Sprint 8.1 tip (`6b11a7790b32d8075797e5b9b8405f75e9089770`). This local Sprint 8.2 branch starts from the content-equivalent tip. Its Git ancestry must be synchronized with remote `main` before a future PR. No push or merge is part of this sprint.

## User flow

1. A Briefing card's “View market news” link opens News Center with Crypto, Korea, US, or Macro visibly selected. A headline link opens the relevant article query without silently overriding the active chart.
2. News cards show related-symbol chips. Mapped symbols have an explicit “Open in Market” action. The mapping is to stable internal instrument IDs, preserving the Upbit/Binance/Korea/US venue context. Index-only symbols with no instrument remain non-interactive.
3. Opening or reading a News card does not change the active instrument. Only clicking a mapped symbol records it as recently viewed, intentionally selects it, and navigates to Market Explorer.
4. The AI Copilot contains a compact related-demo-news section for the active instrument; it updates on selection changes and shows “No related demo news yet” when there is no match. The chart area remains untouched.

## News foundation

- `NewsProvider` defines an asynchronous article-loading boundary. `MockNewsProvider` is the only registered provider; the Dashboard snapshot, Briefing, News Center, Global Search, and Copilot consume its data through the existing service/hook path. A licensed real provider is deferred.
- Pure news selectors combine search text, category, related market, sentiment, importance, and optional active-symbol filtering. Result count and filter state remain visible; empty results have a clear message. The filters are independent of data loading.
- Cards show title, source, publication time, category, summary, mock label, and related symbols. Expansion adds sentiment, importance, related markets, trust wording, and an optional source link.
- External links are rendered only when an absolute HTTPS URL passes the existing safety check. Links use `target="_blank"` and `rel="noopener noreferrer"`; `javascript:`, `data:`, `file:`, and HTTP links are blocked. Current mock fixtures have no external URLs.

## Language and trust

New filter, card, symbol-action, related-news, sentiment, importance, empty-state, and source-link labels are available in English and Korean. Symbols, exchange names, company names, and source names remain untranslated. Mock labels, “Not investment advice,” user-final-decision wording, and “AI analysis is not active yet” remain visible at the point of use.

## Validation and limitations

Automated coverage includes provider provenance, link-ID integrity, category/market/sentiment/importance and combined filters, empty results, card expansion and safe links, Briefing → filtered News, News → active instrument, no-click context preservation, Binance context, and active-instrument related news. Manual browser review is deferred to the user under the security boundary.

The mock fixtures are small and static. Their sentiment and importance fields are illustrative metadata, **not live analysis or investment signals**. Index-only news references cannot open a tradeable chart. Real RSS/API integration, crawling/scraping, real AI analysis and scoring, push alerts, portfolio analysis, trading/order execution, backend/database, and user accounts are deferred.
