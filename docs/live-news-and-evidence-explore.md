# Live news and evidence exploration

This release is prepared on a feature branch from main `5a55830`.
It does not merge main, alter local development defaults, enable paid AI calls,
or change the running Railway service. Deployment needs the user's approval.

## What works

| Surface | Behavior |
| --- | --- |
| News, home news, related instrument news | Shared real RSS feed, with explicit demo selection retained |
| News provenance | Original title, source, publication date and HTTPS article link; no copied article bodies, invented summaries or sentiment |
| AI Explore → Live condition search | User-triggered top 12 by turnover in the selected quote market; actual 1H, 4H and daily candles |
| Search filters | Direction, reference-frame volume, long-side reward/risk and overextension |
| Search results | Coverage, price criteria, inspection timestamp, exclusion reasons and link to current analysis |
| AI Explore → Daily candidate records | Existing bucket views, saved records, filters and plan deep link remain available |
| My analysis → Ask about this analysis / Copilot → Evidence assistant | Working questions about direction, prices, risk and related news, with explicit rule-based labeling |

The assistant supports Korean/English topic matching, not general language
reasoning. Unknown questions explain the available topics. Price questions
inspect actual candles, reuse the receipt-bounded result for at most 90 seconds,
and refuse stale, missing, mock or wrong-instrument evidence. Answers retain their
answer timestamp, remain only in memory, and reset on instrument/mode/language
change. No questions, holdings or notes are sent to an AI provider.

## Readability and focused screens

- First-time visitors start in Simple view. Existing saved Simple/Expert choices
  are preserved; this does not change PC development or provider configuration.
- Crypto analysis leads with an everyday-language action, one explanation and
  two reference price areas. A buyer and a holder receive different guidance.
  Entering a positive average price selects holding context, without writing or
  modifying a saved portfolio position.
- Missing, stale and example data are explicitly distinguished from a market
  waiting signal. Entry guidance remains conditional; touching a price area is
  not treated as a confirmed purchase trigger. The calculation engine, price
  precision, timeframe rules and expiry thresholds are unchanged.
- Full target/stop levels, indicators, volume, execution samples and dominance
  remain in Evidence. Investment inputs and scenario saving remain in My
  investment. The redundant global Copilot sidebar is suppressed on My Analysis,
  with its stored preference restored on other routes.
- Live search shows four matching coins initially, with a Show more button.
  Optional filters and detailed price evidence are collapsed, and active filters
  remain indicated when collapsed. All scanned results still participate in
  filtering; pagination creates no additional market-data requests.
- Korean evidence questions use the same plain-language action summary.
  This is a presentation change, not a new prediction model or free-form AI.

## Data and resource boundaries

- Official feeds: [CoinDesk](https://www.coindesk.com/arc/outboundfeeds/rss)
  and [Federal Reserve](https://www.federalreserve.gov/feeds/press_all.xml).
  Headlines remain in their original language. Known coin names in titles are
  routing hints; this is not entity understanding or a claim of investment impact.
- The existing market-data Docker image also serves `/api/news/headlines`.
  No database, extra server, SDK, exchange key or paid news key is required.
- Only two fixed feed URLs are fetched. Arbitrary URLs, redirects, credentials,
  XML entities, oversized responses, unexpected origins and write methods are rejected.
- Five-minute shared server cache and in-flight sharing; seven-second source
  timeouts, 30-second failed-source retry interval, maximum 30-minute stale grace.
  Source receipt timestamps never advance on failure. Failed live feeds never
  silently become example news.
- The browser refreshes news every five minutes while visible. Manual refresh
  respects the server cache. Each source exposes ready/delayed/unavailable state.
- The scanner uses at most two instruments concurrently, three frames each,
  with an 18-second per-instrument timeout. Unmount, stop and mode changes release
  subscriptions. Search does not run automatically on page load.
- Binance scanning is USDT only, so turnover comparisons never mix quote units.
  Upbit KRW, BTC and USDT are separate selectable markets.
- Existing freshness, minimum closed-bar count and source-gap checks are preserved.
  Results expire 90 seconds after the original quote receipt, not after the scan
  finishes. Rescan is explicit. Partial coverage is shown, never padded with
  synthesized bars.
- Reward/risk filtering uses the buy-zone midpoint, even when screening a
  sell-side trend. Sell cards instead display rebound resistance and the price
  above which the sell-side interpretation needs review. No order is placed.
- The existing relay's ingress/client quotas remain. Multi-user production
  capacity and commercial feed permissions still need a release review; RSS
  availability alone does not establish a commercial redistribution license.

## What still needs configuration or implementation

Real model-generated explanations/free-form chat are **not enabled**. The existing
local-only AI gateway still requires a server API key, selected model, access
token, explicit request consent and a persistent budget limit. This release makes
the evidence question interface functional without representing rule answers as
model output. It does not expose an unauthenticated paid public endpoint.

Stock prices remain mock; DART remains optional/local. Existing simulated
forecast panels, market briefing, settings placeholder, future plan/credit
information, accounts/cloud sync and automated trading are not completed by this PR.
Existing features remain accessible rather than being deleted.

## Deployment after approval

1. Deploy the reviewed commit to the **existing** Railway trial service using
   `backend/market-data/Dockerfile`. Preserve its resource limits, region and
   `UPBIT_ALLOWED_ORIGINS`. Do not upgrade the plan.
2. Run the existing market verifier and the new news verifier against its public
   address with browser origin `https://lggunwoo45-ops.github.io`.
   `NEWS_PROXY_URL` is the server origin, without `/api/upbit` or another path.
3. Set GitHub Actions variable `NEWS_PROXY_URL` to
   `https://upbit-market-relay-trial.up.railway.app`.
   Keep `UPBIT_RELAY_URL` unchanged.
4. Merge only after approval and checks. Pages builds receive
   `VITE_NEWS_PROXY_URL`. The workflow checks both fresh news sources and CORS
   before publishing when the variable is configured.
5. Verify the public site's news, filters, stop/navigation cleanup, selected
   analysis, assistant and chart responsiveness. Without the news variable, the
   production live view explicitly reports unavailable rather than contacting
   the visitor's localhost.

Local developers keep existing defaults and can explicitly set
`VITE_NEWS_PROXY_URL=http://127.0.0.1:8791` and the same server's
`VITE_UPBIT_RELAY_URL=http://127.0.0.1:8791/api/upbit`.
Set the server's `PORT`, `HOST` and `UPBIT_ALLOWED_ORIGINS` only in that process.
No PC configuration or dependency installation is changed.

## Validation

The automated checks cover source URL safety, partial failures, cache sharing,
stale expiry, no demo substitution, cancellation, quote-currency separation,
two-worker limits, actual closed-bar decisions, unsupported questions, context
reset, and existing daily candidate navigation.

Local browser validation on 2026-10-20 received 45 actual headlines (25 CoinDesk,
20 Fed). A KRW scan processed 12 assets, with 9 usable results and 3 explicit
data-quality exclusions. These are observed samples, not production coverage or
latency guarantees. Complete test/build and PR check results are recorded in the PR.
