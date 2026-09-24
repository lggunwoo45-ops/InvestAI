# Market Copilot frontend

Market Copilot is the visible product name; the repository and internal compatibility identifiers remain InvestAI.

Production-oriented desktop workspace built with React 19, TypeScript, and
Vite. Sprint 7.4 keeps the active chart visible while browsing other markets,
adds a Korean/English UI foundation, and retains the smart dashboard,
multi-watchlists, news, TradingView charts, and public real-time market data. AI,
trading, backend, authentication, and database capabilities remain deliberately
unimplemented.

## Commands

```bash
npm install
npm run dev
npm run check
npm run build:windows-demo
```

`npm run check` runs linting, strict TypeScript validation, UI smoke tests, and
a production build.

### Optional local DART proxy

The Korean-stock disclosure panel can use the localhost-only DART proxy. The
credential is read by Node from `DART_API_KEY`; it is never a `VITE_` variable
and is not included in the browser bundle.

```powershell
$env:DART_API_KEY="your_key_here"
npm run dart:proxy
```

The proxy listens on `http://localhost:8788`. Without a key it returns an
explicit disabled state. Instruments without a verified corporation-code
mapping return `mapping_unavailable`. Never commit a populated `.env` file or
print the credential in logs.

`npm run build:windows-demo` creates `InvestAI_v0.6.2_demo.exe` and
`InvestAI_v0.6.2_portable.zip` in `frontend/release`. The launcher serves the production bundle on
a private loopback port and opens it in the default browser; LIVE mode requires
internet access and MOCK mode remains available offline.

The demo uses `http://127.0.0.1:18460` as its stable origin so Local Storage
watchlists survive normal restarts. If that port is occupied, it tries ports
`18461`, `18462`, and `18463` in order.

## Source boundaries

- `app`: application composition, providers, navigation, and routes
- `pages`: route-level feature boundaries
- `components`: reusable, presentation-focused UI components
- `layouts`: persistent desktop shell regions
- `hooks`: reusable React behavior
- `services`: external capability contracts and the replaceable mock market service
- `store`: shared UI state plus selected-market context for the AI Copilot
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
- Market UI reads normalized data only from `services/market/marketDataService`.
- New live venues implement `RealtimeMarketProvider` without changing market components.
- Legacy chart, orderbook, and trade contracts remain the MOCK compatibility layer.
- Live adapters are selected only inside `MarketDataService`; presentation code remains transport-agnostic.
- `MarketDataService` is the sole facade for LIVE/MOCK routing and normalized subscriptions.
- Upbit and Binance adapters own vendor REST/WebSocket translation; React never opens a socket.
- Stream reconnect uses capped exponential backoff and exposes its state to the terminal UI.
- Dashboard data is normalized behind `DashboardService`, so future remote news and discovery feeds replace one service boundary.
- Watchlists are versioned local state today and can migrate behind a repository interface when accounts and a backend arrive.
