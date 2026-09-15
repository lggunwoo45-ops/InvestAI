import type { MarketConnectionState, MarketDataMode, MarketInstrument, MarketSectionData } from '@/types/market'
import type { ChartTimeframe, MarketDetailSnapshot } from '@/types/marketDetail'
import { InstrumentNavigator } from '../InstrumentNavigator/InstrumentNavigator'
import { MarketDetailPanel } from '../MarketDetailPanel/MarketDetailPanel'
import { TradingInformation } from '../TradingInformation/TradingInformation'
import styles from './MarketDetailWorkspace.module.css'

interface MarketDetailWorkspaceProps {
  sections: readonly MarketSectionData[]
  snapshot: MarketDetailSnapshot
  connection: MarketConnectionState
  favoriteIds: ReadonlySet<string>
  selectedTimeframe: ChartTimeframe
  onSelectInstrument: (instrument: MarketInstrument) => void
  onSelectTimeframe: (timeframe: ChartTimeframe) => void
  marketDataMode: MarketDataMode
  onMarketDataModeChange: (mode: MarketDataMode) => void
  onToggleFavorite: (instrumentId: string) => void
  onBack: () => void
}

export function MarketDetailWorkspace({ sections, snapshot, connection, favoriteIds, selectedTimeframe, marketDataMode, onSelectInstrument, onSelectTimeframe, onMarketDataModeChange, onToggleFavorite, onBack }: MarketDetailWorkspaceProps) {
  return (
    <div className={styles.workspace}>
      <InstrumentNavigator
        sections={sections}
        selectedInstrumentId={snapshot.instrument.id}
        favoriteIds={favoriteIds}
        onSelect={onSelectInstrument}
        onToggleFavorite={onToggleFavorite}
        onBack={onBack}
      />
      <MarketDetailPanel snapshot={snapshot} connection={connection} selectedTimeframe={selectedTimeframe} marketDataMode={marketDataMode} onSelectTimeframe={onSelectTimeframe} onMarketDataModeChange={onMarketDataModeChange} />
      <TradingInformation snapshot={snapshot} connection={connection} />
    </div>
  )
}
