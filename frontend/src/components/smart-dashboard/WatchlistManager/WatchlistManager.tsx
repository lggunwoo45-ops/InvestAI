import { memo, useMemo, useState, type DragEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { Icon } from '@/components/Icon/Icon'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useWatchlists } from '@/hooks/useWatchlists'
import type { MarketInstrument, MarketSectionData } from '@/types/market'
import { formatMarketChange, formatMarketPrice } from '@/utils/formatMarketValue'
import styles from './WatchlistManager.module.css'

interface WatchlistManagerProps {
  sections: readonly MarketSectionData[]
  resolvedInstruments?: ReadonlyMap<string, MarketInstrument>
}

export const WatchlistManager = memo(function WatchlistManager({ sections, resolvedInstruments }: WatchlistManagerProps) {
  const navigate = useNavigate()
  const { selectInstrument } = useMarketWorkspace()
  const { watchlists, activeWatchlistId, setActiveWatchlistId, createWatchlist, deleteWatchlist, toggleInWatchlist, removeFromWatchlist, reorderWatchlist } = useWatchlists()
  const [newListName, setNewListName] = useState('')
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const catalog = useMemo(() => {
    const all = new Map(sections.flatMap((section) => section.instruments).map((instrument) => [instrument.id, instrument] as const))
    for (const [id, instrument] of resolvedInstruments ?? []) all.set(id, instrument)
    return all
  }, [sections, resolvedInstruments])
  const activeList = watchlists.find((list) => list.id === activeWatchlistId) ?? watchlists[0]
  const entries = (activeList?.instrumentIds ?? []).map((id) => ({ id, instrument: catalog.get(id) ?? null }))
  const availableInstruments = [...catalog.values()].filter((instrument) => !activeList?.instrumentIds.includes(instrument.id))

  const openInstrument = (instrument: MarketInstrument) => {
    selectInstrument(instrument)
    navigate('/market')
  }

  const handleDrop = (event: DragEvent, targetIndex: number) => {
    if (!activeList || event.dataTransfer.getData('application/x-investai-watchlist') !== activeList.id) return
    event.preventDefault()
    if (dragIndex !== null) reorderWatchlist(activeList.id, dragIndex, targetIndex)
    setDragIndex(null)
  }

  const handleCreate = (event: FormEvent) => {
    event.preventDefault()
    createWatchlist(newListName)
    setNewListName('')
  }

  return (
    <section className={styles.panel} aria-labelledby="watchlist-title">
      <header><div><span>PERSONAL MARKET BOARD</span><h2 id="watchlist-title">Watchlist 2.0</h2></div><div className={styles.headerActions}><small>Saved locally</small>{activeList && !activeList.isDefault && <button type="button" onClick={() => deleteWatchlist(activeList.id)} aria-label={`Delete ${activeList.name} watchlist`}>Delete list</button>}</div></header>
      <div className={styles.tabs} role="tablist" aria-label="Watchlists">
        {watchlists.map((list) => <button key={list.id} type="button" role="tab" aria-selected={list.id === activeList?.id} onClick={() => setActiveWatchlistId(list.id)}>{list.name}<span>{list.instrumentIds.length}</span></button>)}
      </div>
      <div className={styles.list}>
        <div className={styles.tableHead}><span>Symbol</span><span>Last</span><span>Change</span><span /></div>
        {entries.map(({ id, instrument }, index) => (
          <div
            key={id}
            className={styles.row}
            draggable
            onDragStart={(event) => { if (!activeList) return; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('application/x-investai-watchlist', activeList.id); setDragIndex(index) }}
            onDragEnd={() => setDragIndex(null)}
            onDragOver={(event) => { if (event.dataTransfer.types.includes('application/x-investai-watchlist')) event.preventDefault() }}
            onDrop={(event) => handleDrop(event, index)}
          >
            {instrument ? <>
              <button type="button" className={styles.asset} onClick={() => openInstrument(instrument)}><i>⋮⋮</i><span><strong>{instrument.symbol}</strong><small>{instrument.name}</small></span></button>
              <span className={styles.price}>{formatMarketPrice(instrument)}</span>
              <span className={instrument.change24hPercent >= 0 ? styles.positive : styles.negative}>{formatMarketChange(instrument.change24hPercent)}</span>
            </> : <><span className={styles.unavailable}><i>⋮⋮</i><span><strong>Unavailable</strong><small>{id}</small></span></span><span className={styles.price}>—</span><span className={styles.price}>—</span></>}
            <button type="button" className={styles.remove} onClick={() => activeList && removeFromWatchlist(activeList.id, id)} aria-label={`Remove ${instrument?.symbol ?? id}`}>×</button>
          </div>
        ))}
        {entries.length === 0 && <div className={styles.empty}>Use a market star to add instruments to this list.</div>}
      </div>
      <div className={styles.addAsset}>
        <select value={selectedAssetId} onChange={(event) => setSelectedAssetId(event.target.value)} aria-label="Symbol to add">
          <option value="">Add symbol to {activeList?.name ?? 'watchlist'}</option>
          {availableInstruments.map((instrument) => <option key={instrument.id} value={instrument.id}>{instrument.symbol} · {instrument.name}</option>)}
        </select>
        <button type="button" disabled={!selectedAssetId || !activeList} onClick={() => { if (activeList && selectedAssetId) { toggleInWatchlist(activeList.id, selectedAssetId); setSelectedAssetId('') } }}>Add symbol</button>
      </div>
      <form className={styles.create} onSubmit={handleCreate}>
        <Icon name="plus" size={12} /><input value={newListName} onChange={(event) => setNewListName(event.target.value)} placeholder="Create watchlist" aria-label="New watchlist name" /><button type="submit">Add</button>
      </form>
    </section>
  )
})
