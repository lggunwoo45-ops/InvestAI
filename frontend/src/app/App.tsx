import { BrowserRouter, HashRouter } from 'react-router-dom'

import { AppRoutes } from '@/app/AppRoutes'
import { AppProviders } from '@/app/providers/AppProviders'

export function App() {
  const isFileProtocol = window.location.protocol === 'file:'
  const Router = isFileProtocol ? HashRouter : BrowserRouter
  const basename = !isFileProtocol && window.location.hostname.endsWith('github.io') ? '/InvestAI' : undefined

  return (
    <AppProviders>
      <Router basename={basename}>
        <AppRoutes />
      </Router>
    </AppProviders>
  )
}
