import { use } from 'react'

import { MarketWorkspaceContext, type MarketWorkspaceValue } from '@/store/marketWorkspaceContext'

export function useMarketWorkspace(): MarketWorkspaceValue {
  const workspace = use(MarketWorkspaceContext)

  if (!workspace) {
    throw new Error('useMarketWorkspace must be used within MarketWorkspaceProvider.')
  }

  return workspace
}
