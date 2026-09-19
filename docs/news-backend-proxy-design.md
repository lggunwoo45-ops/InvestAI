# News Backend Proxy Design

## Status and boundary

This document defines the Sprint 9.2 boundary between Market Copilot's frontend and future authorized news sources. Sprint 9.4 adds a localhost-only experimental prototype for one official RSS source. It is not a production backend, hosted endpoint, credentialed provider, paid feed, scraping path, cache service, or production news claim.

The frontend must continue to consume the existing `NewsProvider` / `NewsService` boundary. UI components must never fetch a publisher URL, carry a provider secret, parse remote XML, or depend on a source-specific response shape.

## Goals

- Present one stable, normalized contract to the frontend.
- Keep provider credentials and source rules outside the browser.
- make source licensing, attribution, freshness, and failures visible rather than silently substituting content.
- Support cancellation, pagination, bounded caching, partial results, and deterministic tests.
- Preserve internal instrument IDs as the only trusted market-linking key.

## Proposed flow

```text
News UI
  -> NewsService (frontend)
    -> News API client / future ProxyNewsProvider
      -> same-origin News Backend Proxy
        -> request validation + policy enforcement
        -> provider orchestrator
          -> approved RSS adapter
          -> approved public API adapter
          -> future licensed provider adapter
        -> normalization + instrument mapping
        -> bounded cache
        -> normalized response
```

The proxy is not a general-purpose URL fetcher. All upstream destinations are server-owned, reviewed, and allowlisted. The client can select supported filters but cannot submit a feed URL.

## Sprint 9.4 local prototype

The prototype listens only on `localhost:8787` and exposes `GET /api/news/rss?source=fed-press`. The `source` value maps server-side to the fixed Federal Reserve Board HTTPS RSS URL. Unknown sources, additional query keys such as `url`, non-GET methods, oversized responses, unsafe XML, and invalid feeds fail with JSON responses. It uses no credentials, persistence, cache, authentication, or production deployment configuration.

This narrow endpoint is intentionally different from the proposed production `/api/news/v1/articles` contract below. The prototype validates the transport and normalization boundary before a production contract is implemented.

Sprint 9.5 shares the active `NewsLoadResult` across News Center, Market Briefing, and AI Copilot. Normalized Local Proxy articles can therefore enter the transparent analysis input package without another fetch. Articles with explicit verified symbol links are instrument-specific; unlinked `macro` articles are market-level only. UI filters do not mutate this provider result. This connection supplies evidence provenance, not AI interpretation, causality, ranking, or a recommendation.

## Proposed frontend contract

### Articles

`GET /api/news/v1/articles`

Supported query parameters:

- `q`: bounded free-text query.
- `market`: one supported market identifier.
- `category`: one supported category identifier.
- `symbols`: bounded comma-separated display symbols; the server resolves these against verified mappings.
- `sentiment`: supported normalized value, including `unassessed`.
- `importance`: supported normalized value, including `unassessed`.
- `cursor`: opaque server-issued cursor.
- `limit`: server-bounded page size.

Example response shape:

```json
{
  "requestId": "news_01...",
  "generatedAt": "2026-09-19T12:00:00Z",
  "freshness": "fresh",
  "providerState": "ready",
  "nextCursor": null,
  "articles": [
    {
      "id": "provider:stable-id",
      "title": "...",
      "summary": "...",
      "source": "Approved Publisher",
      "publishedAt": "2026-09-19T11:58:00Z",
      "url": "https://approved.example/article",
      "category": "macro",
      "relatedMarkets": ["macro"],
      "relatedSymbols": [],
      "relatedInstrumentIds": {},
      "sentiment": "unassessed",
      "importance": "unassessed",
      "isMock": false
    }
  ],
  "warnings": []
}
```

The response must map cleanly to `NewsArticle`. Unsupported inference fields remain `unassessed`; the proxy must not invent sentiment, importance, or symbol links.

### Health and capability metadata

`GET /api/news/v1/status` returns service readiness, enabled capability names, freshness, and degraded-source counts. It must not expose provider secrets, internal URLs, stack traces, or infrastructure details.

### Error envelope

```json
{
  "requestId": "news_01...",
  "error": {
    "code": "NEWS_TEMPORARILY_UNAVAILABLE",
    "message": "News is temporarily unavailable.",
    "retryable": true
  }
}
```

Stable public codes should distinguish validation failure, rate limiting, timeout, unavailable source, invalid upstream payload, and service misconfiguration. User-facing text remains localized by the frontend.

## Provider and normalization boundary

Each upstream adapter owns transport, upstream authentication, response validation, attribution metadata, and source-specific rate limits. The orchestrator owns deadlines, concurrency limits, deduplication, partial success, and fallback policy. The normalizer produces the product-owned article contract.

Instrument linking requires a reviewed mapping to InvestAI `InstrumentId`. Title matching alone cannot create a tradable market link. Ambiguous names remain unlinked and are safe to read as news.

## Cache and freshness policy

- Cache keys use a canonical bounded filter set and never contain secrets.
- Every provider receives a reviewed TTL based on its publication and licensing rules.
- Responses identify `fresh`, `stale`, or `unavailable`; stale content is never presented as live.
- A short stale-if-error window may preserve read availability when permitted by the source agreement.
- Cache size, article count, response bytes, and retention are bounded.
- ETag or equivalent conditional requests are preferred where the provider supports them.
- Cache invalidation and source removal must be possible without a frontend release.

## Failure handling

- One failed source must not cancel valid results from another source.
- `providerState` is one of `ready`, `partial`, `stale`, `unavailable`, or `not-configured`.
- Partial responses include safe warning codes and successful articles.
- The frontend decides whether to show its explicitly labeled mock fallback; the proxy never disguises mock content as real.
- Client cancellation should stop downstream work where supported.
- Request and upstream deadlines are finite. Retries are bounded, jittered, and limited to retry-safe failures.

## Security and governance

- Use a strict upstream host and protocol allowlist; HTTPS only.
- Resolve and validate destinations server-side to prevent SSRF, redirects to private ranges, and DNS rebinding.
- Enforce response byte, decompression, XML depth, item count, and parsing time limits.
- Reject DTD and external entities. Sanitize or strip remote markup before normalization.
- Render article text as text and expose only validated HTTPS article URLs.
- Keep provider keys in a managed server-side secret store; never log or return them.
- Apply same-origin deployment where practical, or a narrow explicit CORS origin list.
- Add per-client and per-source rate limits without using article content as an authorization signal.
- Complete source-rights review for storage, excerpt length, thumbnails, attribution, deep linking, and redistribution before enablement.
- Maintain a source registry recording owner, approval status, contract constraints, and emergency disable control.

## Observability

Structured logs and metrics should record request ID, provider ID, duration, cache outcome, article count, normalized failure code, and response freshness. They must omit credentials, full upstream payloads, personal identifiers, and unbounded search text. Alerts should cover sustained upstream failure, stale-data age, invalid payload spikes, and cache saturation.

## Test strategy

- Contract tests for request validation and normalized response shape.
- Adapter tests with local fixtures only; unit tests must not depend on live network availability.
- Security tests for redirects, private addresses, oversized/compressed payloads, malicious XML, unsafe URLs, and invalid encodings.
- Orchestrator tests for cancellation, timeouts, partial success, deduplication, caching, and bounded retries.
- Frontend tests with an injected proxy provider and deterministic ready/partial/unavailable responses.

## Deferred implementation sequence

1. Approve source policy and contract with legal/security review.
2. Validate the completed local-only Sprint 9.4 prototype and its fixed allowlist with manual localhost testing.
3. Review the official source's publication, attribution, storage, and operational terms before any hosted use.
4. Validate freshness, attribution, cache, failure, and operational controls.
5. Consider hosted deployment only after an explicit security and production-readiness review.

