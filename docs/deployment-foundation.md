# Deployment Foundation

## Purpose / 목적

This document defines a safe deployment boundary for the Market Copilot beta. It is preparation, not a deployment. No cloud resource, domain, account, database, payment system, broker, or production secret is created by Sprint 10.17.

이 문서는 Market Copilot 베타를 안전하게 배포하기 위한 경계를 정의합니다. 실제 배포가 아니라 준비 단계이며, Sprint 10.17에서는 클라우드 리소스·도메인·계정·데이터베이스·결제·브로커·운영 비밀값을 만들지 않습니다.

## Current local architecture

```text
Browser (Vite/React static application)
  ├─ Public market providers (existing provider layer)
  ├─ Optional news proxy  http://localhost:8787
  └─ Same-origin /api/dart/* (Vite development proxy)
       └─ Optional DART proxy  http://localhost:8788
            └─ DART_API_KEY (server process only)
```

- The frontend is a static React 19/Vite build.
- News and DART proxies are separate, optional Node processes.
- The app remains usable with clearly labelled mock or limited evidence when either proxy is absent.
- Local Storage is device/browser-origin scoped. There is no account sync or database.

## Suggested beta architecture

```text
Static HTTPS host
  └─ Market Copilot frontend
       ├─ approved public market endpoints
       ├─ HTTPS news proxy (separately hosted, allowlisted sources)
       └─ HTTPS DART proxy (separately hosted)
              └─ DART_API_KEY in server secret storage
```

The static host and proxies should be independently deployable. The browser receives only proxy base URLs. A future hosted proxy must add explicit origin allowlists, request limits, timeouts, response validation, observability, and secret rotation before a public beta. This design does not authorize a general-purpose proxy.

## Runtime configuration

Copy `frontend/.env.example` to an untracked local environment file only when overrides are needed.

| Variable | Visibility | Default | Purpose |
| --- | --- | --- | --- |
| `VITE_APP_ENV` | Public browser bundle | `local` | Environment label (`local`, `preview`, `staging`, `production`) |
| `VITE_NEWS_PROXY_URL` | Public browser bundle | `http://localhost:8787` | Optional news proxy base URL |
| `VITE_DART_PROXY_URL` | Public browser bundle | unset (same-origin `/api/dart/*`) | Optional explicit DART proxy base URL for a separately hosted proxy |
| `DART_API_KEY` | Server process only | unset | OpenDART credential for the optional DART proxy |

All `VITE_` values are public after build and must be treated as non-secret. `DART_API_KEY` must never be renamed to a `VITE_` variable, committed, printed to logs, embedded in static files, or sent to the browser. Public market API identifiers and proxy URLs are configuration; credentials, private tokens, account data, and broker keys are server secrets.

## Local commands

From `frontend`:

```powershell
npm install
npm run dev
npm run news:proxy   # optional, separate terminal
npm run dart:proxy   # optional, separate terminal; reads DART_API_KEY
```

Validation and a production-like local preview:

```powershell
npm run test:proxy
npm run lint
npm run typecheck
npm run test -- --maxWorkers=1
npm run build
npm run preview
```

`npm run preview` serves the static frontend build. It does not start either proxy. Run optional proxy processes separately.

The Vite development server forwards same-origin `/api/dart/*` requests to
`http://localhost:8788`. A static preview or hosted build must provide the same
route at its host, or set `VITE_DART_PROXY_URL` to an explicitly hosted proxy
base URL at build time.

## Public beta readiness checklist

- [ ] HTTPS static host selected and preview build verified
- [ ] Hosted news/DART proxies reviewed as separate services
- [ ] Browser origins allowlisted by each proxy
- [ ] Server secrets stored outside source control and static hosting
- [ ] Rate limits, request timeouts, response validation, and safe error messages verified
- [ ] CSP and other security headers configured at the host
- [ ] Korean and English core routes reviewed
- [ ] Accessibility keyboard/screen-reader pass completed
- [ ] Live, mock, unavailable, disabled, limited, and configuration-needed states reviewed
- [ ] Privacy, legal, compliance, and source-license review completed
- [ ] No trading, broker, real-AI, account, payment, or profit-guarantee claim exposed
- [ ] Rollback owner and incident contact identified

## Known limitations

- Real AI, trading, brokerage, authentication, payment, database, portfolio sync, and production stock providers are not connected.
- News and DART are optional local experiments; production hosting and operational controls are not implemented.
- DART coverage depends on the verified corporation-code map and a server-side key.
- Local Storage does not synchronize across devices or origins and is not durable account storage.
- Public market sources can be unavailable or rate-limited.
- The status panel reports states already observed by the app; it is not an active uptime monitor.
- A public beta still requires legal, privacy, security, accessibility, source-license, and operational review.

## Summary / 요약

**English:** The frontend can be built as static files. Optional news and DART capabilities must run as separate hosted proxies later. Public URLs may enter the Vite bundle; secrets never may. Missing optional services must degrade to explicit limited/disabled states without breaking the app.

**한국어:** 프런트엔드는 정적 파일로 빌드할 수 있습니다. 선택형 뉴스·DART 기능은 향후 별도 호스팅 프록시로 운영해야 합니다. 공개 URL만 Vite 번들에 넣을 수 있고 비밀값은 절대 넣지 않습니다. 선택 서비스가 없어도 앱은 중단되지 않고 제한·비활성 상태를 명확히 표시해야 합니다.
