import type { PropsWithChildren } from 'react'

import { AppErrorBoundary } from '@/components/AppErrorBoundary/AppErrorBoundary'
import { MarketWorkspaceProvider } from '@/store/MarketWorkspaceProvider'
import { UiStoreProvider } from '@/store/UiStoreProvider'
import { WatchlistProvider } from '@/store/WatchlistProvider'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AppErrorBoundary>
      <UiStoreProvider>
        <WatchlistProvider>
          <MarketWorkspaceProvider>{children}</MarketWorkspaceProvider>
        </WatchlistProvider>
      </UiStoreProvider>
    </AppErrorBoundary>
  )
}
