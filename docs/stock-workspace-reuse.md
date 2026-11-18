# Preserve stock work in a separate product preview

## Scope and user journeys

Market Copilot's public build is crypto-only. Opening Market, global search, analysis search, watchlists or news must not offer a stock analysis journey. Old stock bookmarks show an unavailable-market notice with a link back to Market. A saved stock selection must not turn into a Bitcoin analysis under the old URL.

The separate local stock preview reuses the existing components: select a Korean or US stock, open its chart, follow its identity into analysis, and inspect available disclosure evidence. Both display modes remain available. This is a development workspace, not a stock launch or a new live data integration.

## Reused implementation and limits

| Existing work | Reuse | Current limitation |
| --- | --- | --- |
| Stock catalog | 200 cached identities for each of KOSPI, KOSDAQ, NASDAQ and NYSE; original IDs and KRW/USD currencies | Frozen subset, not a current full listed universe |
| Market list, chart, adjustable panels | Same components as the crypto product | Stock quotes, candles and orderbook are simulated |
| Analysis and stock price scenarios | Existing technical analysis and evidence display | Real, sufficiently fresh completed daily candles are required for stock price targets; mock data cannot unlock them |
| OpenDART client, company-code mapping and proxy | Existing Korean disclosure integration is retained | Requires a separately configured server-side connection; this change does not establish or verify a live connection |
| Watch candidate engine | Existing rule-based stock candidate workflow | Not a new fundamental analysis or brokerage integration; source quality remains visible |
| Saved watchlists and review notes | Existing storage schemas retained | Public views filter stocks without deleting their records; a new domain will need an explicit migration/export design |

## Running the preview

From `frontend`, run `npm run dev:stocks`, then open `http://127.0.0.1:4198/market?lang=ko`. This command binds only to this PC. The preview has its own four-item navigation and a persistent notice that stock prices are simulated. It does not mount the member cloud sign-in boundary.

`npm run build:stocks` writes `frontend/dist-stocks`. The normal `npm run build` remains crypto-only. GitHub Pages publishes only `frontend/dist`; CI also builds the stock preview to prevent shared changes from silently breaking the retained stock work. No URL parameter or local browser preference switches the public build to stocks.

## Storage and data boundaries

- Product scope is selected at build time and checked in navigation, catalog hooks, the market data singleton and workspace selection.
- The generic market data service remains reusable for either product. Its public singleton rejects out-of-scope catalogs, histories and subscriptions before provider access.
- Watchlists expose only the current product's instruments. Reordering visible entries preserves hidden entries; removing a mixed list from the crypto view preserves its hidden stock records.
- Local previews use a different origin from the public site. Existing public records are not automatically copied into the preview.

## Acceptance checks

Automated tests cover blocked legacy routes, ignored saved stock selection in crypto, unchanged stored stock records after crypto edits, exact market identity/currency, and the separate stock chart-to-analysis journey. Existing CI covers both builds as well as the normal frontend/backend checks.

Browser verification is separate: use the real connected browser to check the crypto representative/all-coin list, the stock mock label, stock chart-to-analysis navigation, mode switching, and phone layouts. Do not seed production account records for tests. A final public check is required after successful CI and deployment of the exact main revision.

## Next stock milestones

1. Select a permitted stock data source, verify redistribution and usage conditions, and connect actual quotes plus adjusted daily history. Include trading calendars, currency and source time. Do not promise a free commercial real-time feed before these are verified.
2. Validate the Korean company-code map and the existing OpenDART connection with real disclosures; show unavailable evidence honestly.
3. Add stock-specific market breadth and sector-relative strength using real constituent data, rather than renaming Bitcoin dominance. Add investor flows only when the data source is established.
4. Validate Simple/Expert stock journeys, then decide the independent public address and account/data migration. No paid services, separate public stock deployment or brokerage orders are introduced by this change.
