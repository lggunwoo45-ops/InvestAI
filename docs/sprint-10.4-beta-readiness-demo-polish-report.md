# Sprint 10.4 — Market Copilot 1.5 Beta Readiness + Demo Polish

## Scope

Sprint 10.4 prepares the existing Market Copilot 1.5 Beta for a clear, honest investor demonstration. It does not add market logic, real AI, accounts, payment, trading, or backend services.

## Delivered

- Added a bilingual **1.5 Beta Readiness** matrix: ready for demo, needs validation, and deferred.
- Added a bilingual seven-step **5-minute investor demo script** with presenter notes.
- Added visible known limitations and nine investor feedback questions.
- Added reusable `DemoHealthChecklist` with manual-only checks. It does not probe services or execute terminal commands.
- Expanded quick links for Market Radar, Watch Candidates, Korea Stocks, US Stocks, News, and AI Usage.
- Added bilingual presenter guidance that separates prohibited claims from the approved beta positioning.
- Kept the visible product label as **Market Copilot 1.5 Beta** without changing package or release versions.

## Safety and positioning

The demo is presented as a decision-support beta with AI-ready architecture. Crypto is the most validated workflow; stock candidate coverage is intentionally early beta. Real AI remains disconnected and planned behind usage and cost controls.

The application must not be presented as a completed trading platform, guaranteed-profit system, AI stock picker, or auto-trading system. The required phrases appear only inside the clearly marked presenter warning section.

## Manual demo health checks

Before a presentation, the presenter manually confirms:

1. Local news proxy and frontend are running when the demo requires them.
2. Demo routes open successfully.
3. English and Korean language switching works.
4. Real AI remains disabled.
5. Trading and order execution remain inactive.

## Known limitations

- No real AI model.
- Stock data is mock or limited and no real stock provider is connected.
- No production news backend or news translation.
- No user accounts, payment, subscriptions, cloud sharing, or production backend.
- No trading or order execution.

## Validation boundary

Automated tests cover bilingual rendering, readiness and safety copy, internal quick-link targets, and the manual checklist contract. Browser walkthrough and visual validation remain a user-run manual step.
