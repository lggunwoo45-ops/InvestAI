import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@/app/App'
import { initializeUpbitRelay } from '@/services/market/providers/upbitRelay'
import '@/assets/styles/globals.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('InvestAI root element was not found.')
}

const root = createRoot(rootElement)
void initializeUpbitRelay().then(() => root.render(
  <StrictMode>
    <App />
  </StrictMode>,
))
