# Market catalog boundary

`MarketDataService.getMarketCatalog(venue, mode)` is the sole catalog entry point for React.
The live adapters use public quotation endpoints only; no account, trading, or backend service exists.
The catalog cache is scoped by venue and mode, and live catalogs expire after 60 seconds.
Single-symbol chart/orderbook/trade subscriptions continue through the existing provider facade.

The frozen `stockCatalog.json` contains 200 company identities for each of KOSPI,
KOSDAQ, NASDAQ, and NYSE. Company identities were selected from
[Adanos free-ticker-database](https://github.com/adanos-software/free-ticker-database)
(MIT license, source commit `5c0476d3879396767151ec0b211665dbb8308747`).
Korean display aliases were reconciled against a historical
[FinanceData stock master](https://github.com/FinanceData/stock_master) and prominent
company labels were reviewed separately. This is a **demo universe snapshot**, not a
current official exchange listing. Prices, changes, and volumes are deterministic
simulations; the UI marks them MOCK. A future licensed stock provider can replace
`StockCatalogProvider` without changing the explorer component.

Future integrations must preserve the internal `MarketInstrument.id` in watchlists,
recently viewed state, and any future automation. `providerSymbol` is only an
adapter-facing exchange identifier and must never become an execution identity.
