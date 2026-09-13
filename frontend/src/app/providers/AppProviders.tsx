import type { PropsWithChildren } from 'react'

import { AppErrorBoundary } from '@/components/AppErrorBoundary/AppErrorBoundary'
import { MarketWorkspaceProvider } from '@/store/MarketWorkspaceProvider'
import { UiStoreProvider } from '@/store/UiStoreProvider'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AppErrorBoundary>
      <UiStoreProvider>
        <MarketWorkspaceProvider>{children}</MarketWorkspaceProvider>
      </UiStoreProvider>
    </AppErrorBoundary>
  )
}
