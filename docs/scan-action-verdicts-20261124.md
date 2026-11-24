# Scan decisions: user journey and acceptance criteria

Start: deployed main `3ac37c8197e2f4eb2d3dade8f87a045b64a2fb00`, clean feature branch.

Journey: Home → find coins → inspect up to 12 fresh assets → read a definite decision for each side → see the price / closed-bar / volume requirement and stop / observed target where a viable plan exists → open the same instrument's chart.

- Show entry-ready, price waiting, close waiting, volume waiting and excluded decisions separately. An `avoid` strategy must never appear as an ordinary unconfirmed recommendation.
- Order decisions by entry eligibility before relative momentum. A stronger move cannot promote a structurally invalid, overheated or countertrend-excluded plan above a viable waiting plan.
- Give a scan-level conclusion and counts across all assessed assets, not only the three displayed cards. Zero ready is a valid result; distinguish an assessed exclusion from missing data.
- State observed values against the failed threshold. When a short-term reassessment line was already crossed, do not present it as the next unmet entry condition or combine it with an obsolete remote zone.
- Preserve strict strategy checks, fees, venue / currency / instrument identity, closed-bar evidence, expiry, validation records and existing expert workflows. Do not force a trade or invent a target to fill a quota.
- Verify reproduced regressions with tests, run existing CI, inspect desktop and phone layouts and the live journey without creating production records, then publish the exact CI-passed main revision and verify the public route.

## Implementation

A shared decision classifier separates ready, price / closed-bar / volume / recovery / flow waiting, and excluded outcomes. Exclusions take precedence for broken stops, heat, remote plans, invalid geometry, inadequate net reward/risk and failed trend gates. The classifier never upgrades a strategy's `avoid` status to a waiting or ready recommendation. Both spot and futures lists rank viable waiting plans ahead of excluded momentum observations.

The cards show measured RSI, volume ratios, trend rules and cost-adjusted reward/risk rather than a generic request for further confirmation. A solved reward/risk entry boundary is explicitly a cost calculation, not an invented observed level or a new entry zone. Already-crossed short-term references cannot send the user back to a remote entry-zone condition. Invalid / excluded plans do not display a green payoff panel or actionable price grid.

## Verification evidence

- Regression coverage: strong-but-excluded candidates sort behind viable waiting candidates; stop / heat / remote-plan / countertrend exclusions remain excluded; concrete volume requirements and full-scan counts are rendered; a crossed reference never reappears as the missing entry condition; numerical cost boundaries remain distinct from entry permission.
- Local connected-browser scan: 12 Binance futures assessed on both sides. This snapshot had no eligible entry, with explicit trend / heat / reward/risk / distance exclusions. PIEVERSE's neutral 4H trend was correctly distinguished from insufficient data and from volume waiting.
- Local spot scan: 12 Upbit KRW assets inspected, 10 assessed and 2 unavailable; unavailable data was kept outside the entry-exclusion count.
- Connected-browser phone layout measured `innerWidth=390`, `innerHeight=844`, `scrollWidth=390`; no horizontal overflow. Temporary viewport override reset afterwards.
- The PIEVERSE card opened `my-analysis?instrumentId=binance-pieverse` and the loaded analysis retained Binance Futures / USDT identity and current quote.
- No production user, scenario, alert, validation or execution records were created during browser checks. Automated tests use fixtures separately from these live observations.

Public deployment SHA, CI results and post-deployment verification are recorded separately in the workspace verification artifacts. Strategy profitability is not established by these regression or browser checks; the existing signal gates and validation ledger are unchanged.
