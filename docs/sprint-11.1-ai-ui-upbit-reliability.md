# Sprint 11.1 — manual AI explanations and Upbit reliability

This branch includes the previously reviewed-but-unmerged Sprint 11.0 backend
(PR #75) and compact Upbit quote row (PR #76), then adds the work below. Review
this as a consolidated successor; avoid merging duplicate PRs independently.
No merge, deployment, real OpenAI request or charge was performed.

## Manual local AI flow

The existing AI Analysis Foundation now contains a separate **Real AI explanation**
section, in Korean and English. Existing deterministic mock analysis stays clearly
separate. It does not call anything on mount, instrument selection or price updates.

1. **Prepare evidence and cost limit** freezes the selected symbol, quote and
   context source, preparation timestamp, explicit limitations and at most three
   bounded news headlines. No holdings, notes, credentials, mock scenarios or
   confidence scores are included. News retains demo/source provenance. A
   preparation timestamp is not a quote observation timestamp or freshness claim.
2. The authenticated local estimate endpoint calculates a conservative reservation
   using the exact submitted text and existing server controls. It makes no
   provider call and no budget reservation.
3. The user reviews the frozen text and USD ceiling and checks an explicit paid
   request consent box. Only then can **Request one AI explanation** send a single
   request. There is no automatic retry or automatic response to changing quotes.
4. The browser-supplied maximum is checked again on the backend before any budget
   reservation/provider call. Server lifetime accounting from Sprint 11.0 remains
   authoritative. Responses are rendered as plain React text, labeled unverified,
   without advice/signals or numeric confidence. Model wording is not a factual
   guarantee. Changing instrument/language clears the staged consent/result and
   aborts pending UI work. Aborting does not refund a provider request already sent.

## Credential boundary and activation

Vite dev/preview has a dedicated, default-off `/api/local-ai/` middleware. It is
server tooling, not shipped browser code. It accepts only loopback clients with
literal localhost/127.0.0.1 Host and a same-origin HTTP Origin for POST, exact
allowlisted routes/methods, JSON and bounded bodies. It injects `AI_ACCESS_TOKEN`
from the Vite server process into a fixed `127.0.0.1:8789` upstream. Browser
Authorization/Origin headers are never forwarded and cannot select the target.
Analyze additionally requires positive `maxCostUsd` and consent. No permissive
CORS, browser token storage, credential form or public Pages API is added.

After separate explicit approval only, configure the backend's documented model,
key, prices, budget and access token; start it on loopback. Independently set
`AI_LOCAL_UI_ENABLED=true` and the same `AI_ACCESS_TOKEN` **in the local Vite
server process environment**, then start dev/preview bound to loopback. Never use
`VITE_` credentials. Environment examples are not automatically loaded by this
middleware. A build alone does not enable it. Public Pages shows the inactive
explanation and does not support paid execution. No paid configuration was set
for this sprint. This remains a local single-operator prototype, not public auth.

## Upbit root cause and changes

The previous detail loader issued four REST requests concurrently, alongside the
catalog and other consumers, and required all four to succeed before opening the
stream. [Upbit's current rate limits](https://docs.upbit.com/kr/reference/rate-limits)
apply a one-per-ten-seconds policy to browser Origin requests. This creates a
repeatable failure mode even when the catalog has successfully loaded.

- One shared per-page pacing gate spaces Upbit REST calls and stream connection
  attempts by 10.5 seconds. Cancelled queued work is skipped. 429 and 418 extend
  the cooldown (with numeric Retry-After seconds when exposed); no immediate retry
  occurs inside the gate. Existing service retries also pass through this gate.
- Detail startup requests only historical candles through REST. Ticker, orderbook
  and recent trades use initial public websocket snapshots and subsequent updates.
  Their lists remain empty while waiting for real stream data; no fake fallback
  data is inserted. This can take time on a cold load, especially with other
  catalog requests queued.
- Historical candles use candle start time rather than last-trade time, allowing
  current-bar updates to replace the matching interval correctly.
- No unsupported `candle.1d` channel is requested. Daily intraday updates are
  derived from new realtime trades after the REST history. They are not a claim
  of exchange-complete daily volume across gaps; reloading history reconciles it.
- Stream message parsing errors are contained. Unsubscribe cancels pending
  websocket connection waits. Ticker volume retains quote-currency turnover
  semantics used by catalog/labels.

Pacing is per loaded page, not a distributed IP quota. Multiple tabs/apps or other
clients on the same IP can still trigger limits; Upbit may change/enforce stricter
policies. No proxy, credential or rate-limit bypass was introduced. The compact
KRW/BTC/USDT row from PR #76 is retained.

## Validation

Fake-time pacing tests cover shared starts, cancellation and extended cooldowns.
Provider tests cover a single historical REST call, candle timestamps and daily
subscription payload. Reconnect tests cover cancellation before handshake. AI
tests cover no mount calls, explicit consent, frozen evidence, duplicate-click
protection, instrument reset, plain-text output and disabled/error states. Node
tests cover local gateway origin/host/method/body/path restrictions and credential
injection, plus a free HTTP estimate and server-enforced client spend ceiling.
All AI tests inject fake provider data; no key or real model is needed.

Final local validation: 136 frontend test files / 656 tests passed, backend 9
passed, existing proxy tests 15 plus gateway security tests 2 passed. Lint and
typecheck passed, with three existing lint warnings; production build passed with
the existing bundle-size warning. Browser verification showed Upbit KRW 296
instruments, historical chart, LIVE synchronization, orderbook and recent trades,
with no captured console errors. Korean UI displayed the default-off local AI
message after the free prepare action. Live OpenAI output quality was not tested.
