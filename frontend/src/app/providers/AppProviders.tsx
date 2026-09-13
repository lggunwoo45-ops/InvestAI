import type { PropsWithChildren } from 'react'

import { AppErrorBoundary } from '@/components/AppErrorBoundary/AppErrorBoundary'
import { UiStoreProvider } from '@/store/UiStoreProvider'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AppErrorBoundary>
      <UiStoreProvider>{children}</UiStoreProvider>
    </AppErrorBoundary>
  )
}
