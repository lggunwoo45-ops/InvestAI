import type { ReactNode } from 'react'
import type { MarketConnectionState, MarketDataMode } from '@/types/market'
import type { ChartTimeframe, MarketDetailSnapshot } from '@/types/marketDetail'
import { MarketDetailPanel } from '../MarketDetailPanel/MarketDetailPanel'
import { TradingInformation } from '../TradingInformation/TradingInformation'
import styles from './MarketDetailWorkspace.module.css'

interface MarketDetailWorkspaceProps {
  navigator: ReactNode
  snapshot: MarketDetailSnapshot
  connection: MarketConnectionState
  selectedTimeframe: ChartTimeframe
  onSelectTimeframe: (timeframe: ChartTimeframe) => void
  marketDataMode: MarketDataMode
  onMarketDataModeChange: (mode: MarketDataMode) => void
}

export function MarketDetailWorkspace({ navigator, snapshot, connection, selectedTimeframe, marketDataMode, onSelectTimeframe, onMarketDataModeChange }: MarketDetailWorkspaceProps) {
  return (
    <div className={styles.workspace}>
      {navigator}
      <MarketDetailPanel snapshot={snapshot} connection={connection} selectedTimeframe={selectedTimeframe} marketDataMode={marketDataMode} onSelectTimeframe={onSelectTimeframe} onMarketDataModeChange={onMarketDataModeChange} />
      <TradingInformation snapshot={snapshot} connection={connection} />
    </div>
  )
}
