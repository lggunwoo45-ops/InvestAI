import type { MarketInstrument, MarketSectionData } from '@/types/market'
import type { ChartTimeframe, MarketDetailSnapshot } from '@/types/marketDetail'
import { InstrumentNavigator } from '../InstrumentNavigator/InstrumentNavigator'
import { MarketDetailPanel } from '../MarketDetailPanel/MarketDetailPanel'
import { TradingInformation } from '../TradingInformation/TradingInformation'
import styles from './MarketDetailWorkspace.module.css'

interface MarketDetailWorkspaceProps {
  sections: readonly MarketSectionData[]
  snapshot: MarketDetailSnapshot
  favoriteIds: ReadonlySet<string>
  selectedTimeframe: ChartTimeframe
  onSelectInstrument: (instrument: MarketInstrument) => void
  onSelectTimeframe: (timeframe: ChartTimeframe) => void
  onToggleFavorite: (instrumentId: string) => void
  onBack: () => void
}

export function MarketDetailWorkspace({ sections, snapshot, favoriteIds, selectedTimeframe, onSelectInstrument, onSelectTimeframe, onToggleFavorite, onBack }: MarketDetailWorkspaceProps) {
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
      <MarketDetailPanel snapshot={snapshot} selectedTimeframe={selectedTimeframe} onSelectTimeframe={onSelectTimeframe} />
      <TradingInformation snapshot={snapshot} />
    </div>
  )
}
