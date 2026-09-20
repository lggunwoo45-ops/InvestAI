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
- **9.4 — Local News Proxy prototype:** localhost-only fixed-source RSS transport, normalization, explicit provider mode, and safe demo fallback are implemented for experimental testing. Production backend, hosting, caching, and source expansion remain deferred.
- **9.5 — News + AI Evidence Connection:** normalized Mock, Browser RSS, and Local Proxy RSS provider results now feed a transparent AI evidence package. Explicit symbol links remain instrument-specific; unlinked macro RSS remains market-level. Real AI interpretation and the production news backend remain disconnected.
- **9.6 — Usable Analysis Pilot:** deliver a transparent, deterministic Crypto Watch Candidates screen using existing market and news evidence. It is a research shortlist, not a recommendation, prediction, probability, paid feature, or real AI result.
- **9.7 — Candidate UX polish + feedback loop:** candidate review status, device-only notes, review summaries, status filters, and a human verification checklist are delivered. Feedback never leaves local storage and does not affect Watch Score.
- **9.8 — Candidate Horizon System + Planning Zones:** short-term, swing, and long-term candidate profiles, review cadence guidance, rule-based planning reference bands, and local lifecycle snapshots are delivered without trading instructions.
- **9.9 — AI usage, cost control, and product tier foundation:** deterministic Free/Basic/Pro policies, feature access states, planning credit estimates, and non-executable AI placeholders are delivered. Prices and credits are illustrative; no AI, billing, account, or entitlement service is connected.
- **10.0 — News Insight to Watch Candidate Suggestions foundation:** normalized news now feeds a deterministic, provider-independent insight contract in News Center and the candidate workspace. Macro scope remains market-level, direct symbols remain explicit, rule-based insight stays free, and all real AI/paid actions remain disabled.
- **10.1 — Market Radar Dashboard foundation:** `/dashboard` now leads with deterministic hot-sector, relative-volume, volatility, watch-candidate, news-theme, and risk context. It reuses existing catalog, candidate, and NewsService state without direct provider calls, invented instruments, AI inference, or recommendation wording.
- **10.2 — Basic Stock Watch Candidates foundation:** `/ai-analysis` now separates Crypto, Korea Stocks, and US Stocks. Stock candidates use existing deterministic mock catalogs, explicit data-quality labels, safe text-only planning references, local feedback, and supported Market links without real stock providers, fundamentals, AI, or trade signals.
- **10.3 — Market Copilot 1.5 Beta Investor Demo:** `/demo` now presents a typed bilingual capability scope, internal quick links, an eight-step demo flow, directional roadmap labels, trust boundaries, and investor discussion prompts. Shared beta banners on Dashboard and AI Analysis keep crypto, stock, AI, trading, and payment readiness explicit without changing product logic.
- **10.4 — Market Copilot 1.5 Beta readiness and demo polish:** `/demo` now adds a bilingual readiness matrix, seven-step five-minute presenter script, manual health checklist, known limitations, expanded investor questions, stock-specific quick links, and explicit safe-presentation guidance. No real AI, trading, payment, account, backend, or market logic was added.
- **9.10 or later — Paid Sector Picks UI Foundation:** consider roughly three evidence-based watch candidates per sector only after AI usage enforcement, evidence governance, account entitlement, and payment boundaries are approved. These must remain research candidates, not trade recommendations.
- **1.0 — Beta:** consolidate usability, resilience, accessibility, performance, security, and release-readiness findings without unsupported AI claims.

Future news translation work must preserve the original headline and source link, generate a separate clearly labelled Korean summary, and control model cost and API usage. It is not part of the current news provider pipeline.

Paid Sector Picks remains deferred until evidence governance, entitlement, backend, account, and payment boundaries receive dedicated review.

The future first screen should be **Market Radar**, organized around Hot sectors, Unusual volume, Volatility radar, and Watch candidates. It must not present “today's recommended stocks.”

These items do not authorize real AI, paid access, news proxy, account, payment, trading, or recommendation logic before their dedicated reviewed sprints.
