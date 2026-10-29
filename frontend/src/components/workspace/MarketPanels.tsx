import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { useLanguage } from '@/i18n/useLanguage'
import { ResizeHandle } from './ResizeHandle'
import { marketPanelGeometry } from './panelGeometry'
import { usePanelSize, useWorkspaceSize } from './usePanelSize'
import styles from './MarketPanels.module.css'

export function MarketPanels({ navigator, detail, activity, listCollapsed = false, onOpenList }: { navigator?: ReactNode; detail: ReactNode; activity?: ReactNode; listCollapsed?: boolean; onOpenList?: () => void }) {
  const { displayMode } = useDisplayMode(), ko = useLanguage().language === 'ko'
  const [ref, size] = useWorkspaceSize<HTMLDivElement>()
  const prefix = `investai.market.panels.${displayMode}.v1`
  const [list, setList, resetList] = usePanelSize(`${prefix}.list`, 300, 240, 520)
  const [trades, setTrades, resetTrades] = usePanelSize(`${prefix}.trades`, 280, 240, 480)
  const [tradeHeight, setTradeHeight, resetHeight] = usePanelSize(`${prefix}.trade-height`, 340, 220, 800)
  const [listHeight, setListHeight, resetListHeight] = usePanelSize(`${prefix}.list-height`, 340, 200, 800)
  const [focus, setFocus] = useState(false), [hideTrades, setHideTrades] = useState(displayMode === 'simple'), [openList, setOpenList] = useState(false)
  const g = marketPanelGeometry(size.width, list, trades, listCollapsed, !!navigator && !focus, !!activity && !hideTrades && !focus)
  const showList = !!navigator && !focus && (g.layout !== 'narrow' || openList)
  const showTrades = !!activity && !hideTrades && !focus
  useEffect(() => { if (!focus) return; const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setFocus(false) }; document.addEventListener('keydown', escape); return () => document.removeEventListener('keydown', escape) }, [focus])
  const reset = () => { resetList(); resetListHeight(); resetTrades(); resetHeight(); setFocus(false); setHideTrades(displayMode === 'simple'); setOpenList(false); window.dispatchEvent(new CustomEvent('investai-market-layout-reset', { detail: displayMode })) }
  const columns = g.layout === 'narrow' ? 'minmax(0,1fr)' : `${showList ? `${g.listWidth}px ${listCollapsed ? '' : '10px '}` : ''}minmax(0,1fr)${g.layout === 'wide' && showTrades ? ` 10px ${g.tradeWidth}px` : ''}`
  return <div ref={ref} className={styles.workspace} data-market-panel-layout={g.layout} data-chart-focus={focus || undefined}>
    <div className={styles.toolbar} role="group" aria-label={ko ? '마켓 배치 조절' : 'Market layout controls'}>
      <span>{ko ? '화면에 맞춰 자동 배치' : 'Fits available space'}</span>
      {g.layout === 'narrow' && navigator && !focus && <button onClick={() => { if (!openList) onOpenList?.(); setOpenList(v => !v) }} aria-expanded={showList}>{ko ? showList ? '종목 목록 접기' : '종목 목록 펼치기' : showList ? 'Close asset list' : 'Open asset list'}</button>}
      <button onClick={() => setFocus(v => !v)} aria-pressed={focus}>{ko ? focus ? '전체 배치로 돌아가기' : '차트 집중 보기' : focus ? 'Restore panels' : 'Focus chart'}</button>
      {activity && !focus && <button onClick={() => setHideTrades(v => !v)} aria-expanded={showTrades}>{ko ? showTrades ? '호가·체결 접기' : '호가·체결 보기' : showTrades ? 'Hide activity' : 'Show activity'}</button>}
      <button onClick={reset}>{ko ? '배치 초기화' : 'Reset layout'}</button>
      <small>{showTrades && g.layout !== 'wide' && (ko ? '호가·체결은 차트 아래에 표시됩니다. ' : 'Activity appears below the chart. ')}{ko ? '경계선을 끌어 조절 · 키보드 방향키도 지원' : 'Drag dividers or use arrow keys'}</small>
    </div>
    <div className={styles.grid} style={{ gridTemplateColumns: columns, '--trade-height': `${tradeHeight}px`, '--list-height': `${listHeight}px` } as CSSProperties} data-layout={g.layout} data-trades={showTrades || undefined} data-list={showList || undefined}>
      <div className={styles.list} hidden={!showList}><div className={styles.listContent}>{navigator}</div>{g.layout === 'narrow' && <ResizeHandle axis="height" label={ko ? '종목 목록 높이 조절' : 'Resize asset list height'} value={listHeight} min={200} max={800} onChange={setListHeight} onReset={resetListHeight} />}</div>
      {showList && !listCollapsed && g.layout !== 'narrow' && <ResizeHandle label={ko ? '종목 목록 너비 조절' : 'Resize asset list'} value={g.listWidth} min={240} max={g.listMax} onChange={setList} onReset={resetList} />}
      <div className={styles.center}>{detail}</div>
      {showTrades && g.layout === 'wide' && <ResizeHandle label={ko ? '호가·체결 너비 조절' : 'Resize activity width'} value={g.tradeWidth} min={240} max={g.tradeMax} reverse onChange={setTrades} onReset={resetTrades} />}
      <div className={styles.activity} hidden={!showTrades}>
        {activity}
        {g.layout !== 'wide' && <ResizeHandle axis="height" label={ko ? '호가·체결 높이 조절' : 'Resize activity height'} value={tradeHeight} min={220} max={800} onChange={setTradeHeight} onReset={resetHeight} />}
      </div>
    </div>
  </div>
}
