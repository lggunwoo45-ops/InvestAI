# Sprint 8.1 — Market Briefing and News Foundation

## Scope and provenance

- Added a lazy-loaded `/briefing` workspace and primary navigation entry. The existing `/market` home route and Market Explorer selection behavior remain unchanged.
- GitHub's PR #8 merge commit (`aa6c621864d971d21cf1e918992eea7a9ad458ef`) was verified as the latest remote `main` commit. Its file diff from local Sprint 7.4 tip (`1e7fefb55662007a1bc125142ed5379c65e5b190`) is empty. A local `git fetch` failed due to github.com:443 connectivity, so this work branch starts from the content-equivalent local tip. Its ancestry must be reconciled with remote `main` before any future PR; no push or merge is part of this sprint.

## What was added

- Four explicit demo briefing areas: Crypto, Korea Stock, US Stock, and Macro / Global. Each has market mood, why it matters, major movers, gainers, losers, high-volume references, related headlines, and watch points. Every card is marked as simulated/mock.
- Structured `NewsArticle` fields: identity, title, source, publication timestamp, category, related symbols and markets, sentiment, importance, summary, optional URL, and explicit `isMock` provenance. Categories cover Crypto, Korea Stock, US Stock, Macro, Technology, AI, Earnings, and Regulation.
- Existing News Center and dashboard news fixtures use this model. All current headlines are **static illustrative scenarios**, not live or reported news. Cards and the News Center show “Demo news / Mock data”; source is “InvestAI Demo Desk”; titles begin “Demo scenario”. No news API or RSS integration exists.
- Optional external links render only when the URL parses as absolute HTTPS without credentials. Linked cards use `target="_blank"` and `rel="noopener noreferrer"`; unsafe schemes do not produce a link. Current mock articles have no URLs.
- Briefing instrument buttons use stable internal instrument IDs through the existing market-data service. Clicking a resolvable reference selects it, records it as recently viewed, and opens `/market`. Navigation to Briefing alone does **not** clear or replace the active chart instrument. Macro references without an instrument ID are non-interactive.
- Related-headline links open News Center with that headline as a query. Such direct links initially suspend the active-symbol filter so a different already-selected market instrument cannot hide the requested article; users can re-enable symbol filtering.
- AI Copilot includes inactive scenario, watch-condition, risk, and entry-planning reference slots. All values are placeholders, not generated analysis or actionable recommendations. Existing mocked confidence display remains visibly labeled as mock; no AI model was added.
- English and Korean labels were added for the briefing, news taxonomy, trust labels, and Copilot preparation slots. Symbols, exchange names, company names, and source names remain untranslated.

## Trust boundary

The Briefing and News workspaces state that their content is for analysis support only, not investment advice, and that the user makes the final decision. The Copilot scenario section states that AI analysis is inactive. Mock market snapshots and mock headlines are visibly distinguished from real-time quotes and verified reporting.

## Validation

Unit and integration coverage includes fixture-reference integrity, mock-news metadata, HTTPS URL filtering, bilingual labels, intentional Briefing-to-Market navigation, and active-context preservation. Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` inside `frontend/` before handoff. Browser layout and interaction validation are deferred to the user's manual review under the security boundary.

## Known limitations and deferred work

- Briefing observations and news are hand-authored static examples; they are not calculated from live market data and must not be read as current gainers/losers or volume rankings.
- Macro references do not map to a tradeable instrument and therefore cannot open a chart.
- No real news API/RSS, real AI analysis, AI scenario scoring, push alerts, portfolio analysis, trading/order execution, backend/database, or user accounts.
- The existing Copilot mock confidence is legacy demo behavior, not an AI recommendation. A future trust-focused sprint should replace the numeric mock with a neutral unavailable state when no model is configured.
