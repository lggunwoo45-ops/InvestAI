# Simple and Expert experiences

Simple mode is a presentation choice, separate from Free/Ad-free/Premium membership. Both experiences use the same instruments, calculations, validation and saved records. Expert mode adds controls and evidence; it does not change a conclusion or unlock a subscription entitlement.

## Menu contract

| Area | Simple | Expert |
| --- | --- | --- |
| Global navigation | Five primary destinations in the top bar; secondary destinations under each section and More | Desktop sidebar, workspace header and full workspace controls |
| Home / candidate search | Guided candidate search, short reasons and next step | Market context, screening controls and detailed comparison |
| Market | Search/select an asset; choose either price chart or a flow summary; mobile list-to-detail journey | Asset table, chart, session statistics, order book and trades with resizable panels |
| Asset analysis | Current direction, key price zones, upside/downside questions and personal price plan | Full timeframe indicators, chart evidence, volume/context and detailed calculations |
| Analysis tools | One purpose category at a time; short tool descriptions; search reaches all categories | All tools together, input/output descriptions, expanded coverage and limitations |
| Research overview / indicators | Guided market summary; choose sentiment, history, calendar, liquidations or ETF records separately | Concurrent panels, data-source status and detailed evidence |
| Position / risk | Choose position calculation, account connections or public wallet lookup | All position tools and detailed risk metrics together |
| Fees / price comparison | Short guided inputs and a clear calculated result | Detailed fee/funding assumptions and price comparison |
| ETF ledger | Enter one confirmed day using date, flow and source fields; latest seven records with More | CSV bulk entry, revisions and exports |
| Signals / strategies | Guided choices and result explanation | Detailed conditions, parameters and historical comparison |
| Trading calculator | Purchase details followed by target/stop limits | Full inputs and calculations together |
| Holdings | Holdings and estimated profit/loss first | Allocation, risk and detailed metrics |
| News | Reading cards, market selection and search | Additional filters and research context |
| Results | Outcome cards with the original instrument and cost-adjusted simulated range; six at a time | Strategy/period/market/outcome filters, evidence, comparisons and exports |
| Alerts / records | Choose device alerts or server monitoring; short lifecycle explanation | Both monitors and supporting review links together |
| Settings | Select one settings task at a time | Full configuration sections |
| Plans / account / legal | Shared factual membership, account and legal information | Same information; display mode does not affect price or access |

## State and data safeguards

- Task panels mount on first use and then remain mounted when hidden. Switching tasks or display modes preserves their input drafts.
- ETF guided and CSV inputs reuse the existing parser, validation, revision storage and asset separation. Changing the ETF asset or account storage clears drafts to avoid saving one asset's values under another.
- Simple results reuse the existing outcome evaluator. Skipped entries, stops, unresolved evidence and ambiguous target/stop order remain visible. Expert filters persist across a mode switch but do not silently hide Simple outcomes.
- Instrument ID, exchange, spot/futures venue, quote currency and source timestamps remain intact.
- Missing/stale data remains a visible limitation; no fabricated recommendation, success, live value or return is introduced.
- Existing Premium chart entitlements remain enforced in both modes. Chart resizing and timeframe selection remain available.

## Verification

Automated regression coverage includes lazy mounting and draft preservation, ETF validation and revision safety, loss/missing/ambiguous result display, original instrument links, preserved Expert filters, navigation, tools search/IME, research calculations, and market layouts. Existing CI also checks proxy/backend/gateway/Pages packaging, types, lint, the full frontend suite and the production build.

Browser checks use the actual app and read-only market feeds, separate from mocked tests. Desktop and 390px phone views cover the Market list/chart/summary journey, Expert order book and preserved asset identity, guided ETF inputs through mode changes, results and alert entry routes. No production financial records or alerts are created for verification.
