import { use } from 'react'
import { ActiveMarketStateContext } from '@/store/marketWorkspaceContext'

export function useActiveMarketState() {
  const state = use(ActiveMarketStateContext)
  if (state === undefined) throw new Error('useActiveMarketState must be used within MarketWorkspaceProvider.')
  return state
}
