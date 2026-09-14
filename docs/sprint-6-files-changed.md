# Sprint 6 files changed

## Application composition

- `frontend/src/app/App.tsx` — file-protocol router compatibility.
- `frontend/src/app/App.test.tsx` — Sprint 6 UI, search, news, and watchlist coverage.
- `frontend/src/app/AppRoutes.tsx` — lazy Discover route.
- `frontend/src/app/navigation.ts` — Discover navigation item.
- `frontend/src/app/providers/AppProviders.tsx` — global watchlist provider.
- `frontend/src/types/navigation.ts` — Discover icon type.
- `frontend/vite.config.ts` — portable relative asset base.

## Smart dashboard and watchlists

- `frontend/src/pages/Dashboard/DashboardPage.tsx`
- `frontend/src/pages/Dashboard/DashboardPage.module.css`
- `frontend/src/components/smart-dashboard/MarketPulseBoard/MarketPulseBoard.tsx`
- `frontend/src/components/smart-dashboard/MarketPulseBoard/MarketPulseBoard.module.css`
- `frontend/src/components/smart-dashboard/WatchlistManager/WatchlistManager.tsx`
- `frontend/src/components/smart-dashboard/WatchlistManager/WatchlistManager.module.css`
- `frontend/src/store/watchlistContext.ts`
- `frontend/src/store/WatchlistProvider.tsx`
- `frontend/src/store/WatchlistProvider.test.tsx`
- `frontend/src/hooks/useWatchlists.ts`
- `frontend/src/utils/watchlists.ts`
- `frontend/src/pages/Market/MarketPage.tsx` — shared favorites and recently viewed integration.

## Discovery and news

- `frontend/src/pages/Discover/DiscoverPage.tsx`
- `frontend/src/pages/Discover/DiscoverPage.module.css`
- `frontend/src/components/discover/DiscoverTable/DiscoverTable.tsx`
- `frontend/src/components/discover/DiscoverTable/DiscoverTable.module.css`
- `frontend/src/pages/News/NewsPage.tsx`
- `frontend/src/pages/News/NewsPage.module.css`
- `frontend/src/components/news/NewsCard/NewsCard.tsx`
- `frontend/src/components/news/NewsCard/NewsCard.module.css`

## Search, sessions, and dashboard service

- `frontend/src/components/GlobalSearch/GlobalSearch.tsx`
- `frontend/src/components/GlobalSearch/GlobalSearch.module.css`
- `frontend/src/components/MarketStatusStrip/MarketStatusStrip.tsx`
- `frontend/src/components/MarketStatusStrip/MarketStatusStrip.module.css`
- `frontend/src/layouts/Header/Header.tsx`
- `frontend/src/layouts/Header/Header.module.css`
- `frontend/src/layouts/Sidebar/Sidebar.tsx`
- `frontend/src/components/Icon/Icon.tsx`
- `frontend/src/services/dashboard/dashboardService.ts`
- `frontend/src/services/dashboard/mockDashboardData.ts`
- `frontend/src/hooks/useDashboardData.ts`
- `frontend/src/types/dashboard.ts`
- `frontend/src/utils/marketSessions.ts`
- `frontend/src/utils/marketSessions.test.ts`

## Build, release, and documentation

- `frontend/desktop/Launcher.cs`
- `frontend/scripts/build-windows-demo.ps1`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/README.md`
- `docs/sprint-6-architecture.md`
- `docs/sprint-6-ceo-report.md`
- `docs/sprint-6-files-changed.md`

Generated screenshots, GIF, performance JSON, EXE, and ZIP are intentionally stored in the task output directory rather than committed as source.
