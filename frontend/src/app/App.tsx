import { BrowserRouter, HashRouter } from 'react-router-dom'

import { AppRoutes } from '@/app/AppRoutes'
import { AppProviders } from '@/app/providers/AppProviders'

export function App() {
  const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter
  return (
    <AppProviders>
      <Router>
        <AppRoutes />
      </Router>
    </AppProviders>
  )
}
