# Clear investment workspace

## Menu responsibilities

| Menu | Primary task |
| --- | --- |
| Home / 홈 | Saved investment totals and links to the next task |
| Instrument Analysis / 종목 분석 | Review one selected asset and its price levels |
| My Investments / 내 투자 | Manage and analyze every saved open coin holding |
| Find Assets / 종목 찾기 | Discover new candidates to investigate |

Market, News, Settings and Demo routes remain available. `/` now opens Home. The old dashboard's static example price widgets are removed from Home; the existing market overview, watchlists and saved scenarios remain in expandable sections. Home displays at most three news headlines and does not present mock headlines in live market mode. The floating assistant is hidden on these four main workspaces; the contextual analysis assistant remains available.

## Navigation consistency

The current tab remembers the last analysis URL, selected analysis tab, intent, average-price input and note in sessionStorage. Returning via the bare analysis menu restores that context. Explicit asset, holding and snapshot links take precedence and start an independently keyed workspace. Invalid JSON, unavailable storage and invalid draft fields fall back safely. A changed or deleted holding invalidates its saved average-price draft; cross-tab portfolio updates also refresh the holding basis. Analysis drafts do not mutate portfolio records.

## All-holdings review

The user starts analysis explicitly in My Investments. Every saved position with positive quantity is included, including assets outside discovery's top-12 pool. Duplicate lots share one market analysis, but retain separate costs, quantities, profit/loss and detail links. Upbit KRW/BTC/USDT and Binance spot holdings use the existing live analysis engine. At most two unique instruments are inspected concurrently; each uses the existing three timeframes and 18-second deadline.

Each card shows a plain-language holding action, its reason, a downside price with the relevant candle-close condition, and analysis time/coverage. Sell-direction results use the downside support stop for held coins, not the short-side invalidation level. Missing catalogs, unsupported/missing instruments and insufficient analysis data remain visible as data issues, not buy/sell decisions. Catalog source, age, venue and quote currency are checked before analysis.

Results expire no later than 90 seconds after their source quote receipts. Expired price plans and direction labels are withheld; users can rerun analysis. Leaving the page, changing the data mode or editing holdings cancels the run and discards mismatched results. Stopping manually preserves completed results until expiry. Large portfolios take longer and earlier results can expire while later ones are running. Analysis is not saved as a historical report and is not an always-on background monitor.

Cards initially show six records with a load-more control; analysis still includes all open holdings. Trade history and targets remain within each card's expandable management section. Backup/import and saved scenarios remain available below the list. Existing portfolio schema, write-conflict protection, validation, ledger, target/stop settings and watchlist separation are unchanged.

## Quotes and limits

Home and My Investments refresh held-venue quote catalogs every 60 seconds while visible, and when returning to a visible tab. Stale live quotes are withheld after 90 seconds. Currency totals remain separate and incomplete totals are not presented as complete. Quote refresh does not automatically repeat all-holdings analysis.

This change adds no LLM service, automatic trading, cloud portfolio storage, server deployment or paid dependency. Prices and technical analysis remain references, not guaranteed trade instructions. Existing PC commands and configuration remain intact.

## Acceptance checks

- Browser: two test holdings (BTC and ETH) completed live analysis, each with its own action, downside price and detail link.
- Browser: saved BTC detail -> average-price tab -> Home -> analysis menu restored BTC, the exact holding, average price and selected tab.
- Tests: more than 12 unique assets, duplicate lots, closed positions, venue/currency mismatches, failed catalogs, stale/future data, partial failures, concurrency and cancellation.
- Tests: edit/unmount invalidation, expired-action withdrawal, held sell-side downside price, independent currency totals, corrupt storage and navigation restoration.
- Existing portfolio/ledger/backup/watchlist tests remain part of the full suite.

Public deployment remains a separate approval step after reviewing the PR.
