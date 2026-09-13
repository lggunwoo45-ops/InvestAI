# InvestAI frontend

Production-oriented desktop workspace built with React 19, TypeScript, and
Vite. Sprint 1 provides UI architecture only; market, AI, and trading services
are deliberately not implemented.

## Commands

```bash
npm install
npm run dev
npm run check
```

`npm run check` runs linting, strict TypeScript validation, UI smoke tests, and
a production build.

## Source boundaries

- `app`: application composition, providers, navigation, and routes
- `pages`: route-level feature boundaries
- `components`: reusable, presentation-focused UI components
- `layouts`: persistent desktop shell regions
- `hooks`: reusable React behavior
- `services`: implementation-free contracts for external capabilities
- `store`: shared UI state and its provider
- `types`: cross-feature domain and platform types
- `utils`: framework-independent utilities
- `assets`: global styles and future static assets
- `core_ai`: future provider-independent AI engine boundary
- `plugins`: future market and information-provider integrations
- `strategies`: future built-in, user, and community strategy boundaries
- `security`: future credentials, permissions, confirmations, audit, and sessions

## Architecture rules

- Route components compose features; they do not implement providers.
- External integrations implement contracts under `services/contracts`.
- Trading execution must remain behind a reviewed service boundary.
- Provider credentials must never be stored in the browser bundle.
- Empty UI states are intentional until a backend capability is connected.
- Market is the home workspace; Dashboard is a secondary operational summary.
- AI recommendations must expose confidence and a human-readable `Why?`.
