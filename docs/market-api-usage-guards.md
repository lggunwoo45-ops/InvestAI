# Public market API usage protection

Repeated reloads or many tabs must not create unlimited upstream REST work.
The relay now bounds concurrent requests and actual Upbit REST starts, and the
browser honors the relay's cooldown across symbols and timeframes. Normal cold
analysis still requests its three timeframes immediately; no extra delay is
added to successful requests.

## Limits per server process

| Resource | Limit | When reached |
| --- | --- | --- |
| Market HTTP requests per IP | Existing 120 / 60 seconds | 429 with remaining `Retry-After` |
| News HTTP requests per IP | Existing 60 / 60 seconds | 429 with remaining `Retry-After` |
| Concurrent REST consumers | 8 per IP, 32 overall, separately for market/news | 503, retry after 5 seconds |
| Market streaming consumers | Existing 8 per IP, 128 overall | Finite SSE cooldown event, then disconnect |
| Tracked IPs | 1,024 per handler | Reject new identities until expired inactive entries are reclaimed |
| Actual Upbit REST starts | Default 10,000 / hour | 503 until the process's hourly window resets |

The hourly ceiling counts failed calls as well as successful calls. Fresh cache
hits and shared in-flight requests consume no additional upstream allowance.
The existing 2-second REST freshness, 125ms group pacing, 24 upstream market
streams, reconnect backoff and 5-minute RSS cache remain in place. Disconnects
release request/stream slots; idle IP records expire but live streams keep their
quota ownership across minute boundaries. Health probes do not use quotas.

`UPBIT_REST_HOURLY_LIMIT` accepts integers 0..100000; omission uses 10000.
Zero pauses new upstream REST calls (not existing streams). Invalid values stop
server startup. Raising this limit is an operator decision; 10000 is an initial
trial ceiling, not an Upbit contractual quota or a measured production capacity.

HTTP 429 and 503 with `Retry-After` establish an in-memory browser cooldown.
Manual retries and new symbols fail locally during that interval; automatic
snapshot recovery waits for it. It never bypasses the relay by calling Upbit
directly. EventSource cannot expose HTTP error headers, so stream quota failures
use an explicit `cooldown` event which closes the old connection and schedules
a delayed reconnect. Other permanent errors retain their HTTP error status.

## Reverse proxy identity and deployment

Default identity is the socket address. Forwarded headers are ignored on direct
and local development servers. `local: true` always ignores proxy identity.

Railway documents `X-Real-IP` as the client's remote address in its
[HTTP edge specification](https://docs.railway.com/networking/public-networking/specs-and-limits).
Only after verifying that all inbound requests use that trusted edge and no
public direct/TCP path exists, set `RELAY_TRUST_RAILWAY_PROXY=1`. This mode accepts
one valid IP in `X-Real-IP`; invalid, duplicate, comma-separated or scoped values
fall back to the socket. `X-Forwarded-For` is never trusted. IPv6 spellings are
canonicalized. An untrusted caller allowed to reach the port directly can forge
`X-Real-IP`, so the switch must stay off in that deployment topology.

Deploy the frontend cooldown support before or together with the new relay.
On approval, update the existing trial service to the reviewed commit, verify
its HTTP-only ingress, opt into proxy identity and retain its existing origin,
replica and resource limits. Run the existing market/news verifier against the
public URL, then check two independent client networks. Do not load-test the
public service or Upbit to deliberately exhaust a quota.

This PR does not change the deployed Railway service or enable paid services.
The Railway connector requested authentication twice during the read-only
configuration check, so live ingress configuration has not been reverified.

## Scope and limitations

- IP limits are not account limits. Shared Wi-Fi/NAT users share a quota;
  rotating IPs can evade the per-IP limit, but not this process's upstream ceiling.
- Counters are in memory, reset on restart and are per replica. Multiple replicas
  require shared accounting before these can be treated as service-wide quotas.
- A REST ceiling does not cap continuous streaming bandwidth, hosting charges,
  or provide DDoS protection. Hosting spend controls and authenticated daily
  account quotas are separate release work.
- Public paid AI remains disabled. This does not alter the existing local AI
  gateway's consent and persistent budget controls.
- Browser cooldown is per page, not cross-tab; server admission remains the
  authoritative protection. No new identity tokens, holdings or memo uploads.

## Acceptance evidence

- HTTP tests: excess requests blocked before upstream work, exact cooldown
  expiry, probes available during exhaustion, proxy isolation and spoofed-header
  rejection by default, bounded concurrency, disconnect cleanup and finite SSE
  cooldown delivery.
- Ten simulated viewers load three timeframes each: all 30 responses succeed,
  only three fake upstream requests start. This is a local behavior test, not a
  measured Railway load capacity.
- REST budget tests: dedup/cache reuse, failed requests counted, zero pause,
  invalid configuration rejection and hourly recovery.
- Browser tests: symbol changes/retries honor 429/503 cooldowns, date headers,
  cancellation, concurrent success cannot clear a cooldown, SSE reconnect timing
  and stopping retries after navigation.
- Local server with real Upbit data (2026-10-22): catalog 876 rows, three 120-bar
  histories and a fresh BTC ticker passed the existing relay verifier in 530ms;
  all histories were cache misses. This is one PC/network sample, not a public
  website latency promise. The temporary local server was stopped afterward.

## Next release: domestic stock data

Current stock catalog uses deterministic `mock-krx` / `mock-us` quotes. A real
stock provider is still required; an existing stock screen does not mean live
stock data is connected.

After this protection release, implement domestic stock quote + daily history
through a server-only provider, then wire chart, simple/expert analysis and
holdings valuation to the same source. Show market hours, timestamps and delayed
data honestly; unavailable live data must not silently become simulation. Start
with read-only prices and analysis; brokerage order/account access is separate.

For a personal pilot, KIS is a candidate with account/API application requirements.
For a shared/sold product, confirm data redistribution and service terms before
choosing the production source. KIS distinguishes personal usage from partner
services in its [official guide](https://apiportal.koreainvestment.com/about-howto).
No provider purchase, account application, contract or secret submission is
authorized or performed by this PR. API secrets belong only in the server's
secret settings, never in chat, the public frontend or the repository.
