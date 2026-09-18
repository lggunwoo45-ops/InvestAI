# Market Copilot

AI 기반 멀티마켓 투자 운영 플랫폼입니다.

Market Copilot is an AI-assisted investment platform, not a conventional trading
terminal. Market understanding is the primary workflow; AI acts as a copilot
and every recommendation must remain explainable to the user.

The GitHub repository and internal compatibility identifiers remain InvestAI.

## Current foundation

Sprint 7.4 provides a desktop-first Market Explorer with independent browsing
and active-chart contexts, a Korean/English UI foundation, persistent
multi-watchlists, discovery and news workspaces, and a Windows demonstration
package. Public Upbit and Binance market streams are available through the
provider layer; trading and real AI remain intentionally unimplemented.

- `frontend`: React 19, TypeScript, Vite, and a route-based desktop workspace
- `docs`: architecture, security, API, UI, and roadmap documentation

## Supported roadmap

The architecture reserves explicit boundaries for Upbit, Binance, Korean and
US equities, multiple AI providers, manual/semi-automatic/automatic trading,
plugins, and security controls. These are extension points, not implemented
features.

See [`frontend/README.md`](frontend/README.md) for frontend commands and module
boundaries.
