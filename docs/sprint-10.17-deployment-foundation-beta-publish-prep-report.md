# Sprint 10.17 — Deployment Foundation and Beta Publish Prep

## Outcome

Sprint 10.17 prepares Market Copilot for a later reviewed beta publish without deploying anything. Public runtime URLs now have one typed configuration boundary, news and DART clients consume that boundary, Demo shows a deterministic observed-dependency summary, optional-service missing states are explicit, and release/security checklists document the remaining work.

## Runtime configuration

- `runtimeConfig` exposes only public application environment and proxy base URLs.
- Safe localhost defaults preserve existing local behavior.
- `VITE_` values are documented as public browser data.
- `DART_API_KEY` remains server-only and is deliberately absent from runtime config.
- Unit tests cover defaults, overrides, URL normalization, environment flags, and secret exclusion.

## Dependency health model

The health model represents `ready`, `disabled`, `unavailable`, `limited`, and `unknown` states for market data, news proxy, DART proxy, DART API key, real AI, and trading. It consumes state already observed by the app and performs no network probes. Real AI and trading are intentionally disabled and are not rendered as failures.

## Demo status panel

The bilingual Beta System Status panel is available on `/demo`. It distinguishes ready, limited, unavailable, disabled, and configuration-needed states. The panel explicitly explains that it is not an uptime monitor and creates no extra requests.

## Missing-state safety

- Optional news proxy failure continues to explain that clearly labelled demo news remains available and gives a safe next step.
- DART disabled, mapping-missing, unavailable, and empty states now say what is missing, confirm that the remaining analysis still works, and describe the next safe action.
- No raw exception, stack trace, credential, or transport internals are shown.

## Documentation delivered

- `deployment-foundation.md`: local and suggested beta topology, environment boundaries, secret rules, commands, limitations, and readiness checklist.
- `beta-share-checklist.md`: build, route, security, language, and bilingual external-share review.
- `local-release-check.md`: deterministic validation and production-preview commands plus separate proxy-process requirements.
- `.env.example`: safe public placeholders and a commented server-only DART key example.

## Not implemented

- No deployment, cloud resource, DNS, hosted proxy, or public URL
- No real AI, trading, broker, authentication, payment, database, or new market/stock provider
- No health-check network polling
- No secret, account, or credential handling in the browser
- No investment recommendation or execution logic change

## Validation policy

All UI and service tests are deterministic. Health tests use explicit states, runtime configuration tests use supplied objects, and no test calls a real RSS, DART, AI, broker, account, payment, or cloud service.
