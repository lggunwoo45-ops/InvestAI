# Sprint 8.3 — Real News Provider Foundation

## Scope and behavior

The News Center now reads through `NewsService` rather than directly from the dashboard's mock snapshot. `NewsProvider` supplies a stable `id`, `label`, provider `type` (`mock`, `rss`, or `public-api`), and asynchronous `loadNews` contract. `MockNewsProvider` remains the default; existing mock news, search, category, market, symbol, sentiment, importance, and article details remain available.

The user can select **Mock** or **RSS Ready**. RSS Ready is a foundation state, **not** a live feed. All candidate feed URLs are null and disabled, and `RssNewsProvider` performs no request. Selecting it reports **RSS unavailable**, names the displayed mock provider, and explains the fallback. The UI never labels fallback articles as real RSS. If both providers fail, it reports **Provider not configured** with an empty result. Last-updated time is rendered only when a provider returns real content.

## Data boundary

`rssFeedConfig.ts` contains disabled candidate source metadata only; candidates are not endorsements, licensed feeds, or configured endpoints. Source rights, CORS behavior, connectivity, rate limits, cache policy, and transport must be reviewed before enabling any URL. This sprint includes no paid API, scraping, proxy, backend, CORS bypass, or live network fetch.

`rssParser.ts` is a pure RSS 2.0 parser for future provider use. It limits XML size, rejects DTD/entity declarations and malformed XML, normalizes publication dates/source text, allows only safe HTTPS article links, and carries source-configured market/category metadata. Sentiment and importance are `unassessed`; related symbols are empty until a verified entity-to-instrument mapping exists. Titles alone do not create market links, so a name collision cannot silently select a wrong instrument. React renders text as text rather than executing feed markup.

## Extension path

1. Review the source's publication rights, permitted display fields, rate limits, and attribution rules.
2. Decide on an authorized transport compatible with browser CORS and the product security model. This sprint makes no such choice.
3. Add configured feed URLs, request/cancellation behavior, cache/refresh policy, and tests inside the provider/service boundary. UI components should not fetch feeds directly.
4. Add vetted symbol mapping against internal instrument IDs before enabling News-to-Market links for external articles.
5. Distinguish freshness, source errors, and partial provider failures in the existing status contract.

## Validation and limitation

Unit tests cover safe parsing, URL and date handling, provider fallback, no-fetch default, and a future injectable provider. App integration tests cover the RSS Ready fallback and retained search query. English and Korean status strings are present. No browser automation or EXE launch was performed. Because remote fetch was unavailable during development, the local branch starts from the Sprint 8.2 content-equivalent commit rather than the PR #10 merge commit; ancestry must be synchronized with `origin/main` before any future PR.
