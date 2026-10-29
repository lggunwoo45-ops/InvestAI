import type { ReactNode } from 'react'
import type { MarketConnectionState, MarketDataMode } from '@/types/market'
import type { ChartTimeframe, MarketDetailSnapshot } from '@/types/marketDetail'
import { MarketDetailPanel } from '../MarketDetailPanel/MarketDetailPanel'
import { TradingInformation } from '../TradingInformation/TradingInformation'
import { MarketPanels } from '@/components/workspace/MarketPanels'

interface MarketDetailWorkspaceProps {
  onOpenList?: () => void
  navigator: ReactNode
  instrumentListCollapsed: boolean
  snapshot: MarketDetailSnapshot
  connection: MarketConnectionState
  previewAt?: number
  selectedTimeframe: ChartTimeframe
  onSelectTimeframe: (timeframe: ChartTimeframe) => void
  marketDataMode: MarketDataMode
  onMarketDataModeChange: (mode: MarketDataMode) => void
}

export function MarketDetailWorkspace({ navigator, onOpenList, instrumentListCollapsed, snapshot, connection, previewAt, selectedTimeframe, marketDataMode, onSelectTimeframe, onMarketDataModeChange }: MarketDetailWorkspaceProps) {
  return <MarketPanels onOpenList={onOpenList} navigator={navigator} listCollapsed={instrumentListCollapsed}
    detail={<MarketDetailPanel snapshot={snapshot} connection={connection} previewAt={previewAt} selectedTimeframe={selectedTimeframe} marketDataMode={marketDataMode} onSelectTimeframe={onSelectTimeframe} onMarketDataModeChange={onMarketDataModeChange} />}
    activity={<TradingInformation snapshot={snapshot} connection={connection} />} />
}
