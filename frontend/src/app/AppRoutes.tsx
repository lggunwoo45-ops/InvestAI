import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { RouteLoadingFallback } from '@/components/RouteLoadingFallback/RouteLoadingFallback'
import { AppShell } from '@/layouts/AppShell/AppShell'

const AiAnalysisPage = lazy(() => import('@/pages/AiAnalysis/AiAnalysisPage').then((module) => ({ default: module.AiAnalysisPage })))
const MarketBriefingPage = lazy(() => import('@/pages/MarketBriefing/MarketBriefingPage').then((module) => ({ default: module.MarketBriefingPage })))
const DashboardPage = lazy(() => import('@/pages/Dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const DiscoverPage = lazy(() => import('@/pages/Discover/DiscoverPage').then((module) => ({ default: module.DiscoverPage })))
const DemoPage = lazy(() => import('@/pages/Demo/DemoPage').then((module) => ({ default: module.DemoPage })))
const MarketPage = lazy(() => import('@/pages/Market/MarketPage').then((module) => ({ default: module.MarketPage })))
const NewsPage = lazy(() => import('@/pages/News/NewsPage').then((module) => ({ default: module.NewsPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFound/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))
const PortfolioPage = lazy(() => import('@/pages/Portfolio/PortfolioPage').then((module) => ({ default: module.PortfolioPage })))
const SettingsPage = lazy(() => import('@/pages/Settings/SettingsPage').then((module) => ({ default: module.SettingsPage })))
const StrategiesPage = lazy(() => import('@/pages/Strategies/StrategiesPage').then((module) => ({ default: module.StrategiesPage })))
const TradingPage = lazy(() => import('@/pages/Trading/TradingPage').then((module) => ({ default: module.TradingPage })))

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/market" replace />} />
          <Route path="market" element={<MarketPage />} />
          <Route path="briefing" element={<MarketBriefingPage />} />
          <Route path="markets" element={<Navigate to="/market" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="discover" element={<DiscoverPage />} />
          <Route path="demo" element={<DemoPage />} />
          <Route path="portfolio" element={<PortfolioPage />} />
          <Route path="trading" element={<TradingPage />} />
          <Route path="ai-analysis" element={<AiAnalysisPage />} />
          <Route path="strategies" element={<StrategiesPage />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
