# Roadmap

## v0.3.0 Stable
- [ ] 종목 선택 안정화
- [ ] 정렬 기능
- [ ] 차트 안정화
- [ ] WebSocket 안정화
- [ ] 성능 최적화

## Market Copilot 9.x

- **9.2 — News Filter UX and News Backend Proxy design:** active filter visibility and reversible controls are delivered. The authorized server-side boundary, source policy, caching, failure handling, security controls, and safe frontend contract are documented in `news-backend-proxy-design.md`. No backend or proxy is implemented.
- **9.3 — AI Analysis Engine Foundation:** define the structured evidence input package, safe context builder, deterministic mock engine, and transparent AI Copilot display. No real model, prompt execution, external AI call, or probability claim is included.
- **9.4 — Local News Proxy prototype:** test the approved proxy design locally before any hosted service or production feed claim.
- **9.5 — News + AI Evidence Connection:** connect approved normalized news evidence to the analysis package only after the local proxy boundary is validated.
- **9.6 — Paid Sector Picks UI foundation:** design a paid, sector-by-sector view of evidence-based daily **watchlist candidates** or **interest candidates**, targeting approximately three candidates per sector. It must not use aggressive “buy recommendation” language. Real implementation depends on the news/backend foundation and an auditable evidence model.

These items do not authorize real AI, paid access, news proxy, account, payment, trading, or recommendation logic before their dedicated reviewed sprints.
