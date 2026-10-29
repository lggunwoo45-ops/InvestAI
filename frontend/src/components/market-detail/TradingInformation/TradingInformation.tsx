import { memo, useEffect } from 'react'
import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { useLanguage } from '@/i18n/useLanguage'
import { usePanelSize, useWorkspaceSize } from '@/components/workspace/usePanelSize'
import { ResizeHandle } from '@/components/workspace/ResizeHandle'

import { ConnectionIndicator } from '@/components/market-data/ConnectionIndicator/ConnectionIndicator'
import type { MarketConnectionState } from '@/types/market'
import type { MarketDetailSnapshot } from '@/types/marketDetail'
import { Orderbook } from '../Orderbook/Orderbook'
import { RecentTrades } from '../RecentTrades/RecentTrades'
import styles from './TradingInformation.module.css'

interface TradingInformationProps {
  snapshot: MarketDetailSnapshot
  connection: MarketConnectionState
}

export const TradingInformation = memo(function TradingInformation({ snapshot, connection }: TradingInformationProps) {
  const { displayMode } = useDisplayMode(), ko = useLanguage().language === 'ko'
  const [ref, size] = useWorkspaceSize<HTMLDivElement>()
  const [split, setSplit] = usePanelSize(`investai.market.panels.${displayMode}.v1.activity-split`, 60, 25, 75)
  const horizontal = size.width >= 560
  const available = Math.max(1, (horizontal ? size.width : size.height) - (horizontal ? 10 : 14))
  useEffect(() => {
    const reset = (e: Event) => { if ((e as CustomEvent).detail === displayMode) setSplit(60) }
    window.addEventListener('investai-market-layout-reset', reset)
    return () => window.removeEventListener('investai-market-layout-reset', reset)
  }, [displayMode, setSplit])
  const minSize = Math.min(available * .45, horizontal ? 240 : 100)
  const visibleSplit = Math.max(minSize / available * 100, Math.min(100 - minSize / available * 100, split))
  const tracks = `minmax(0,${visibleSplit}fr) ${horizontal ? 10 : 14}px minmax(0,${100 - visibleSplit}fr)`
  const isStock = snapshot.instrument.marketId === 'korea-stock' || snapshot.instrument.marketId === 'us-stock'
  return (
    <aside className={`${styles.panel} ${isStock ? styles.stock : ''}`} aria-label="Trading information">
      <div className={styles.title}><strong>{isStock ? 'Market Activity' : 'Trading Information'}</strong><ConnectionIndicator connection={connection} compact /></div>
      <div ref={ref} className={styles.content} style={{ gridTemplateColumns: horizontal ? tracks : 'minmax(0,1fr)', gridTemplateRows: horizontal ? 'minmax(0,1fr)' : tracks }}>
        <Orderbook instrument={snapshot.instrument} snapshot={snapshot.orderbook} mode={connection.effectiveMode} />
        <ResizeHandle label={ko ? '호가와 체결 비율 조절' : 'Resize orderbook and trades'} axis={horizontal ? 'width' : 'height'} value={available * visibleSplit / 100} min={minSize} max={available - minSize} onChange={n => setSplit(n / available * 100)} onReset={() => setSplit(60)} />
        <RecentTrades instrument={snapshot.instrument} trades={snapshot.recentTrades} mode={connection.effectiveMode} />
      </div>
    </aside>
  )
})
