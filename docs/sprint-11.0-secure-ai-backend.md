# Sprint 11.0 — opt-in AI backend foundation

## Architecture and scope

The existing React/Vite site is deployed as static GitHub Pages. Its AI context
builder and deterministic mock engine remain the default; browser usage/tier
estimates are presentation data, not enforceable billing controls. Existing local
news/DART proxies establish the standalone Node service pattern. This sprint adds
`backend/`, outside Vite's source and public directories, with no dependencies.
It deliberately does not connect the public browser UI to a paid endpoint.

`POST /api/ai/analyze` accepts exactly:

```json
{"consent":true,"symbol":"BTC","language":"ko","evidence":"사용자가 확인할 자료"}
```

The evidence is user-supplied and unverified, not a claim of real-time data.
No model, prompt, URL, token limit, portfolio, order or account field is accepted.
Maximum body: 8192 bytes; evidence: 4000 UTF-8 bytes; symbol: 32 restricted
characters. Unknown fields and missing consent are rejected. There is no trading
route, tool invocation, autonomous loop, forecast probability or confidence score.

## Activation requires separate explicit approval

No deployment or paid call was made for this sprint. After approval only, an
operator may configure the environment described in `backend/.env.example` and
run `npm start --prefix backend` on Node 22+. The example is documentation, not
an automatically loaded environment file. Default AI state is disabled, even
if a key happens to exist. Activation needs `AI_ENABLED=true`, a server-only
`OPENAI_API_KEY`, an independently generated 32–128 character access token,
an explicit reviewed model ID, positive reviewed upper input/output prices,
and a positive lifetime dollar cap. Never use `VITE_` variables for credentials,
commit keys, or place the access token in browser code/storage.

The service binds only `127.0.0.1:8789`. Health reports enabled state only.
Analysis requires a constant-time bearer check, JSON and per-request consent.
Browser Origin requests are rejected; no CORS is enabled. This is a local CLI
foundation, not a multi-user public authentication system. Do not expose it via
a tunnel or reverse proxy. Public hosting requires a separately reviewed identity,
per-user quota, CSRF/origin policy, TLS, audit and shared durable budget design.

## Cost boundaries

The server fixes the upstream HTTPS Responses endpoint, disables redirects and
tools, sets `store:false`, caps output at 512 tokens, and has a 15-second timeout
with no retries. The exact submitted UTF-8 byte length plus a 2048-token framing
margin forms a conservative input allowance. The operator must verify model
compatibility and upper prices (including any applicable service charges) before
activation; this is not a live pricing lookup or provider invoice guarantee.

Before any network request, a USD micro-unit ceiling is rounded up and reserved
in a mode-0600 local ledger. An exclusive file lock serializes reservations,
including across local processes. No automatic reset or refund exists: failures,
timeouts, invalid results and uncertain outcomes retain their reservation.
Corrupt state fails closed. Restarting with the same ledger preserves usage.
One service process allows one in-flight call and at most one attempt per ten
seconds; the persisted budget remains the cross-process financial boundary.

The ledger is local filesystem accounting, not distributed billing. Keep it on
durable local storage; do not delete, roll back, copy to multiple hosts or reset
it to bypass the cap. A crash may leave a lock: stop all instances and reconcile
provider usage before manually recovering it. Filesystem permissions depend on
the host (Windows ACLs need operator review). Configure provider project spending
controls as an additional boundary before approved use.

## Responses and limits

The model is instructed to explain only supplied evidence, uncertainty and missing
information, without advice, unsupported current facts, targets or performance
claims. A strict JSON schema and local field/size checks gate completed responses;
refusal, malformed, incomplete and oversized responses fail with generic errors.
Responses label AI text as unverified, include a fixed Korean/English disclaimer,
and set confidence to null. No raw provider errors, keys, prompts or evidence are
logged. Responses are not cached. `store:false` does not itself guarantee zero
provider retention. See the official [Responses/text guide](https://developers.openai.com/api/docs/guides/text)
and [data controls](https://developers.openai.com/api/docs/guides/your-data).

Prompting and schema checks cannot guarantee factual correctness or neutral wording
inside generated strings. Output remains unverified and must never become an
automatic trading signal. Evaluation of live model behavior and browser integration
are follow-up work requiring approval; mocked tests establish boundaries, not AI
quality or profitability.

## Verification

`npm test --prefix backend` uses injected fake provider responses exclusively.
Coverage includes disabled/misconfigured state, exact schema and byte bounds,
authentication/origin restrictions, concurrency, durable spend reservations,
exhausted/corrupt budgets, request controls, provider failures, incomplete/refusal
results, response bounds and secret-safe errors. Frontend CI runs these alongside
existing proxy tests, lint, type checks, unit tests and production build.

Baseline main `baad7ceed553f5d96b64f30d5adcc28b14f8b2a3`: Frontend CI run
39030282236 and Pages deploy run 39030282276 succeeded. The existing public Pages
URL returned HTTP 200. This feature branch does not trigger Pages deployment.
