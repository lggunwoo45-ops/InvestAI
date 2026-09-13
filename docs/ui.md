# UI Architecture

## Desktop shell

The application targets 1920px and 2560px desktop workspaces. Its persistent
shell contains a collapsible left sidebar, top operations header, scrollable
route outlet, and persistent right AI Copilot.

## Screen boundaries

- Market: primary cross-market and AI-assisted investment workspace
- Dashboard: secondary watchlist, portfolio, AI confidence, news, and signals
- Portfolio: account aggregation and exposure
- Trading: human-controlled order workflows
- AI Analysis: multi-model research
- Strategies: versioned strategy lifecycle
- News: source-aware market feed
- Settings: providers, plugins, permissions, and security policy

Sprint 1.1 makes Market the home workspace and keeps explicit empty states. No
fake market data is rendered.

## Explainability rule

InvestAI displays AI confidence, never an opaque score. Every recommendation
surface must include a visible `Why?` section, even when the explanation engine
has not yet been implemented.
