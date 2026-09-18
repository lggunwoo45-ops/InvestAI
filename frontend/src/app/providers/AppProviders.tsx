import type { PropsWithChildren } from 'react'

import { AppErrorBoundary } from '@/components/AppErrorBoundary/AppErrorBoundary'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { MarketWorkspaceProvider } from '@/store/MarketWorkspaceProvider'
import { NewsProviderModeProvider } from '@/store/NewsProviderModeProvider'
import { UiStoreProvider } from '@/store/UiStoreProvider'
import { WatchlistProvider } from '@/store/WatchlistProvider'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AppErrorBoundary>
      <LanguageProvider>
        <UiStoreProvider>
          <WatchlistProvider>
            <MarketWorkspaceProvider><NewsProviderModeProvider>{children}</NewsProviderModeProvider></MarketWorkspaceProvider>
          </WatchlistProvider>
        </UiStoreProvider>
      </LanguageProvider>
    </AppErrorBoundary>
  )
}
