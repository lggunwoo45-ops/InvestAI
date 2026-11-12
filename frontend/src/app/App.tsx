import { lazy, Suspense } from 'react'
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom'

import { AppRoutes } from '@/app/AppRoutes'
import { AppProviders } from '@/app/providers/AppProviders'
import { CloudBoundary } from '@/components/cloud/CloudBoundary'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { AppErrorBoundary } from '@/components/AppErrorBoundary/AppErrorBoundary'
import { RouteLoadingFallback } from '@/components/RouteLoadingFallback/RouteLoadingFallback'

const LaunchPreviewPage = lazy(() => import('@/pages/LaunchPreview/LaunchPreviewPage').then(module => ({ default: module.LaunchPreviewPage })))

export function App() {
  const isFileProtocol = window.location.protocol === 'file:'
  const Router = isFileProtocol ? HashRouter : BrowserRouter
  const basename = !isFileProtocol && window.location.hostname.endsWith('github.io') ? '/InvestAI' : undefined

  return (
    <Router basename={basename}>
      <Routes>
        <Route path="preview" element={<AppErrorBoundary><LanguageProvider><Suspense fallback={<RouteLoadingFallback />}><LaunchPreviewPage /></Suspense></LanguageProvider></AppErrorBoundary>} />
        <Route path="*" element={<CloudBoundary><AppProviders><AppRoutes /></AppProviders></CloudBoundary>} />
      </Routes>
    </Router>
  )
}
