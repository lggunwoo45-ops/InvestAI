# Sprint 9.4 — Local News Proxy Prototype

## Delivered

Sprint 9.4 adds an optional Node-based localhost proxy that lets Market Copilot test server-side RSS retrieval without exposing an arbitrary URL proxy. The default frontend mode remains Mock, and the application does not require the proxy to be running.

## Run locally

From the repository's `frontend` directory:

Terminal 1:

```powershell
npm run news:proxy
```

Terminal 2:

```powershell
npm run dev
```

The server binds to `localhost:8787`. It is not auto-started with Vite.

## Endpoint and allowlist

The only endpoint is:

```text
GET http://localhost:8787/api/news/rss?source=fed-press
```

The only allowed source ID is `fed-press`, mapped internally to the existing official Federal Reserve Board press-release RSS feed. The request cannot provide a URL. Unknown sources, duplicate capabilities through additional query parameters, and keys such as `url` are rejected before `fetch` is called.

## Security boundary

- Node built-in HTTP and fetch APIs; no new dependency, API key, credential, database, or disk persistence.
- Localhost binding and a narrow CORS allowlist for the local Vite origins on ports 5173 and 5174.
- GET only and JSON responses only.
- Fixed HTTPS upstream; redirects are rejected.
- Eight-second upstream timeout and one-megabyte response limit.
- No browser cookies, authorization headers, or client headers are forwarded.
- DTD/entity XML is rejected. Item count, text lengths, and article URLs are bounded.
- Article URLs must remain HTTPS under `federalreserve.gov`.
- Markup is stripped to plain text; raw XML is never returned.
- Error payloads contain stable codes and safe messages, not stack traces or upstream exception details.
- No fetched content is written to disk or cached.

## Response contract

Success and failure responses contain `source`, `sourceLabel`, `status`, `fetchedAt`, `cacheStatus`, `fallbackUsed`, normalized `articles`, and `errors`. A successful article matches the existing `NewsArticle` model with empty related symbols and `unassessed` sentiment/importance. The prototype does not guess instrument links or analysis attributes.

## Frontend provider mode

News Center and Market Briefing now offer three explicit modes:

- Mock
- RSS Experimental, retaining the existing direct-browser behavior
- Local Proxy Experimental

On success, the UI shows **Local proxy connected** and **Real RSS loaded through local proxy**. On failure, `NewsService` returns explicitly labeled mock articles and shows **Local proxy unavailable. Showing demo news.** plus startup guidance. Real and mock articles are never silently mixed.

The selected provider mode is safely persisted in existing local storage validation. Unknown values still recover to Mock.

## Manual test steps

1. In `frontend`, run `npm run news:proxy`.
2. In a second `frontend` terminal, run `npm run dev`.
3. Open News Center.
4. Select **Local Proxy Experimental**.
5. Confirm **Local proxy connected**, **Real RSS loaded through local proxy**, and Federal Reserve Board articles.
6. Stop the proxy terminal with Ctrl+C.
7. Reload or reselect the provider and confirm **Local proxy unavailable**, startup guidance, and the visibly labeled demo fallback.
8. Return to Mock and RSS Experimental to confirm their existing behavior.

## Automated tests

`npm run test:proxy` uses only injected local response fixtures. It covers normalized success, unsupported sources, non-GET rejection, oversized responses, upstream failure, and arbitrary URL rejection. Vitest covers proxy-contract validation, unavailable-server behavior, NewsService success/fallback states, storage restoration, status UI, provider filtering, and existing Mock/RSS behavior. No test contacts real RSS.

## Experimental limitations and deferred work

This is not a production backend. It has no production source-rights approval, hosted configuration, authentication, rate limiting, cache, persistent store, distributed timeout/retry policy, monitoring, production CORS policy, or deployment hardening. The single-source allowlist is a prototype boundary, not approval to redistribute content.

Sprint 9.5 may connect verified proxy articles into the AI evidence package after manual validation and review. Real AI, paid Sector Picks, trading, authentication, database, payments, and production infrastructure remain out of scope.
