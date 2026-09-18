# Sprint 8.4 — Real RSS Connection Experiment

## Result and scope

The News Center and Market Briefing now share an opt-in provider mode, saved under `market-copilot.newsProviderMode`. A fresh or invalid storage value always selects **Mock**. **RSS Experimental** makes a direct, credential-free browser CORS request to one configured official public feed. It is an experiment, not production news coverage. No RSS request is made in Mock mode.

The only enabled feed is the Federal Reserve Board's [All Press Releases RSS](https://www.federalreserve.gov/feeds/press_all.xml), listed on the [Board's official RSS page](https://www.federalreserve.gov/feeds/feeds.htm). It is mapped to the `macro` news category/market. Crypto, Korea Stock, and US Stock candidate entries remain disabled with null URLs. Source names are not translated.

## Request and trust boundary

`RssNewsProvider` requests only enabled HTTPS feed URLs, with `mode: 'cors'`, omitted credentials, no redirect following, an AbortController, and an eight-second timeout. Response content type and a one-megabyte stream limit are checked before parsing. It uses no proxy, scraping, API key, paid API, backend, database, or CORS bypass. An HTTP failure, malformed/empty feed, timeout, or browser network/CORS rejection is treated as provider failure. The provider never returns partial real/mock combinations.

The existing parser rejects DTD/entity declarations, malformed XML and oversized XML, normalizes title, source and publication date, and removes unsafe article links. It does not infer symbols from titles or prose. Real articles have `relatedSymbols: []`, `sentiment: unassessed`, and `importance: unassessed`; these are deliberate placeholders rather than AI judgments. The News Center exposes these unassessed values as filter choices. Only safe HTTPS article links are rendered.

## UI and fallback

- Mock mode: existing demo news and **Demo news / Mock data** labels remain.
- RSS Experimental success: only RSS articles are shown, with **Real RSS News**, actual source and published time. No mock article is silently mixed in.
- RSS failure: `MockNewsProvider` supplies all articles; the status explains the cause and says **Real RSS unavailable. Showing demo news.** Demo labels remain visible.
- Market Briefing's summaries, mood, movers and watch items are still simulated and visibly marked as such. In RSS success mode, its related-headline sections use RSS articles for matching markets; no fake crypto/stock headlines are inserted. In Mock/fallback mode, the existing mock related headlines remain.
- Both pages display loading/ready/unavailable/fallback state, current mode, actual displayed source, and last-updated time when a real RSS response succeeds. English and Korean strings cover these states.

## CORS and coverage limitations

Whether the Federal Reserve feed permits browser cross-origin requests from the user's demo origin **has not been verified** in this sprint: browser automation and EXE launch were prohibited, and user manual browser validation is scheduled later. A command-line HTTP response would not itself prove browser CORS behavior. If the browser blocks the feed, the expected, tested behavior is a visible network/CORS message and mock fallback. This sprint does not claim that real RSS worked on the user's PC.

Only one macro feed is configured. Therefore a successful RSS response provides macro news only; Crypto, Korea, and US-specific sections may legitimately be empty in RSS mode. Symbol filtering of RSS items returns no matches because entity linking is intentionally disabled. Briefing news titles are not AI summaries or recommendations.

## Validation and deferred work

Tests use synthetic XML and mocked `fetch` to cover opt-in requests, safe HTTPS configuration, no-fetch default, parsing, cancellation, failure classification, fallback, labels, persistence and News/Briefing mode sharing. No live feed or browser CORS claim is inferred from mocked tests. Manual browser testing remains with the user.

Deferred: authorized backend RSS proxy, paid news APIs, AI summarization, AI sentiment scoring, verified entity/symbol extraction, alerts, portfolio analysis, trading/order execution, user accounts, and database.

The local branch is based on a file tree identical to PR #11's merged `main`, but `git fetch` was unavailable. Before any future PR, synchronize its ancestry with current `origin/main`.
