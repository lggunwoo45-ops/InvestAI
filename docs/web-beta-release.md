# Market Copilot 0.11.1 beta.1 — web release candidate

Release target: https://lggunwoo45-ops.github.io/InvestAI/

This release freezes the existing Market Explorer, public crypto chart/orderbook/
trade feeds, watchlists and locally saved reviews. Stock data, scenario output
and parts of news remain explicitly mock or limited. Actual paid AI is off on
Pages; no AI backend, account system, automatic trading or payment is deployed.

PR #77 consolidates #75 and #76. Its feature head f78a706 passed Frontend CI
39036977270. Local validation passed 656 frontend, 9 backend and 17 proxy/gateway
tests, typecheck and production build. Release packaging additionally corrects
direct-link/refresh handling: Pages builds use `/InvestAI/` absolute asset paths
and real per-route index files, plus a 404 fallback. VITE_APP_ENV is production.
The route packager's two tests run in CI.

Public launch requires explicit deployment approval. After that, merge #77 at
its verified head; the existing main push workflow publishes the static build.
Verify that main Frontend CI and Pages both succeed, and check the public root,
direct /market/, /ai-analysis/, /my-analysis/ links, JS/CSS delivery and LIVE/MOCK
labels. Do not treat a successful build alone as a completed launch.

The release ZIP contains only static assets: no backend, environment files,
credentials, browser profiles or user storage. User data remains browser-origin
local; moving between localhost and Pages does not migrate it.

If a deployment regression is confirmed, revert the release merge through a
reviewable rollback change to the previously deployed main baad7ceed553f5d96b64f30d5adcc28b14f8b2a3,
then verify its automatic Pages deployment. Do not enable a paid service as a
workaround. Public upstream availability and IP-wide exchange limits remain
external constraints.
