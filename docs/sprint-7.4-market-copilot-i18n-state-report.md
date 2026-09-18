# Sprint 7.4 — Market Copilot, active context, and language foundation

## What changed

The Market Explorer's browsing venue and the active instrument are independent.
`MarketPage` loads the left catalog from its local `venue` state. The chart,
detail data subscription, and AI Copilot continue to use
`MarketWorkspaceProvider.selectedInstrument`. Selecting a new instrument is the
only ordinary action that changes that active instrument. The explicit **All
instruments** action clears it while retaining the currently browsed venue.

Previously a market-tab click called `clearInstrument()` and returned to the
full-screen Explorer. Now Upbit/Binance, quote, Korea/US, and board changes only
replace the left list. The chart remains visible, even when its instrument is
not in that list. The compact Explorer labels its browsing path separately from
the active analysis symbol and venue. Search still resets on venue changes;
sort and favorite controls retain their previous behavior.

## Product identity

The visible product name is **Market Copilot** in the sidebar, document metadata,
user-facing README text, and launcher startup/error window text. The repository,
package name, EXE filenames, existing launcher log location, mutex, embedded
resource name, health/shutdown protocol responses, and `investai.*` Local Storage
keys remain unchanged for compatibility. Launcher control flow, ports, browser
launch, and persistence behavior have not changed. The separate local v0.7.3
release branch remains available; this feature branch does not rename its
release artifacts.

## Language foundation

English is the default. The header offers English / 한국어; the preference is
stored as `market-copilot.language`. Missing, invalid, or inaccessible storage
falls back safely to English. The `LanguageProvider` supplies a typed UI
dictionary, and the page's `lang` attribute tracks the selection. Current scope
includes navigation, market/workspace labels, search placeholder, sort and result
labels, LIVE/MOCK controls, market session/status labels, core detail labels,
and major AI Copilot copy. Symbols, company names, and provider identities are
not translated.

Some secondary surfaces still use English, including Dashboard body copy,
Discover/News content, global-search result metadata, detailed orderbook and
trade labels, provider connection messages, and placeholder pages. This is a
foundation rather than a full translation pass.

## Validation and remaining work

Tests cover chart retention across venue and major-market changes, independent
left-list browsing, explicit new-instrument selection, AI Copilot context, and
language persistence and switching. Automated lint, typecheck, tests, and build
are required. Visual browser validation is reserved for the user.

Deferred: full repository/brand rename, comprehensive Korean translation,
major two-level Coin/Stock landing redesign, AI forecasts, real news and stock
providers, and trading/order execution.
