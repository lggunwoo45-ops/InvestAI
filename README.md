# InvestAI

AI 기반 멀티마켓 투자 운영 플랫폼입니다.

InvestAI is an AI-assisted investment platform, not a conventional trading
terminal. Market understanding is the primary workflow; AI acts as a copilot
and every recommendation must remain explainable to the user.

## Current foundation

Sprint 1 establishes the production frontend shell and extension contracts. It
does not connect to market APIs, execute trades, or run AI analysis yet.

- `frontend`: React 19, TypeScript, Vite, and a route-based desktop workspace
- `docs`: architecture, security, API, UI, and roadmap documentation

## Supported roadmap

The architecture reserves explicit boundaries for Upbit, Binance, Korean and
US equities, multiple AI providers, manual/semi-automatic/automatic trading,
plugins, and security controls. These are extension points, not implemented
features.

See [`frontend/README.md`](frontend/README.md) for frontend commands and module
boundaries.
