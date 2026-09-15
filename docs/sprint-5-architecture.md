# Sprint 5 real-time market architecture

```mermaid
flowchart LR
  UI[React market workspace] --> Hook[useMarketDetailData]
  Hook --> Service[MarketDataService]

  Service -->|LIVE + Upbit| Upbit[UpbitMarketDataProvider]
  Service -->|LIVE + Binance| Binance[BinanceMarketDataProvider]
  Service -->|MOCK or unsupported market| Mock[MockMarketDataProvider]

  Upbit --> UpbitRest[Upbit public REST snapshot]
  Upbit --> Socket[ReconnectingWebSocket]
  Binance --> BinanceRest[Binance Futures public REST snapshot]
  Binance --> Socket
  Mock --> Legacy[Chart / Orderbook / Trade mock contracts]

  Socket --> Streams[Trade · Ticker · Orderbook · Candle streams]
  Streams --> Service
  Legacy --> Service
  Service --> State[Normalized RealtimeMarketState]
  State --> Chart[TradingView Lightweight Charts]
  State --> Quote[Current price]
  State --> Book[Top 10 orderbook]
  State --> Trades[Recent trades]
  State --> Copilot[AI Copilot context]
```

## Boundary rules

- React components never instantiate `WebSocket`, call exchange REST endpoints, or select a provider.
- `MarketDataService` is the only public facade for market snapshots and subscriptions.
- Exchange providers translate vendor payloads into InvestAI domain types.
- `ReconnectingWebSocket` owns exponential reconnect policy with a 30-second cap.
- Existing Sprint 3 provider contracts remain behind `MockMarketDataProvider` for backward compatibility.
- Adding another live venue requires a new `RealtimeMarketProvider` and one composition-root registration.
