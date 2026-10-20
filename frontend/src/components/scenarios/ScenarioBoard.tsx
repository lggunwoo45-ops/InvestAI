import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useScenarios } from '@/hooks/useScenarios'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useLanguage } from '@/i18n/useLanguage'
import { useScenarioMonitor } from '@/store/scenarioMonitorContext'
import { writeScenarios, type Scenario } from '@/services/scenarios/scenarioStorage'
import { readPortfolio } from '@/services/portfolio/portfolioStorage'
import { portfolioNumber } from '@/utils/formatPortfolio'
import { ScenarioForm } from './ScenarioForm'
import { scenarioCopy } from './scenarioCopy'
import styles from './Scenarios.module.css'

export function ScenarioBoard({ compact = false }: { compact?: boolean }) {
  const store = useScenarios()
  const { observations, running, historyError } = useScenarioMonitor()
  const { marketDataMode } = useMarketWorkspace()
  const { language } = useLanguage()
  const t = scenarioCopy[language]
  const [editing, setEditing] = useState<{ value: Scenario; raw: string | null } | null>(null)
  const [deleting, setDeleting] = useState<{ id: string; raw: string | null } | null>(null)
  const [error, setError] = useState(false)
  const [clock, setClock] = useState(Date.now)
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 5_000); return () => clearInterval(timer) }, [])
  const commit = (scenarios: Scenario[], resetId?: string, raw = store.raw) => {
    writeScenarios({ version: 1, scenarios, events: store.events.filter(e => e.scenarioId !== resetId) }, raw)
    setError(false)
  }
  const priority = (s: Scenario) => {
    const o = observations[s.id]
    return s.enabled && running && o?.revision === s.revision && clock - o.at <= 15_000
      ? o.state === 'stop' ? 0 : o.weakened ? 1 : o.state === 'target' ? 2 : o.state === 'entry' ? 3 : 4 : 5
  }
  const scenarios = compact ? [...store.scenarios].sort((a, b) => priority(a) - priority(b)).slice(0, 3) : store.scenarios
  const positions = readPortfolio().positions
  return <section className={styles.board} aria-label={compact ? t.changes : t.title}>
    <header className={styles.heading}><div><span>MY SCENARIOS</span><h2>{compact ? t.changes : t.title}</h2><p>{t.intro}</p></div><Link to={compact ? '/portfolio' : '/my-analysis'}>{compact ? t.portfolio : t.analysis} →</Link></header>
    <p className={styles.caption}>{t.scope}</p>
    {(store.error || error || historyError) && <p role="alert">{store.error ? t.storage : error ? t.error : t.historyError}</p>}
    {!store.error && !scenarios.length && <p className={styles.empty}>{t.empty}</p>}
    <div className={styles.list}>{scenarios.map(s => {
      const raw = observations[s.id]
      const o = running && raw?.revision === s.revision && clock - raw.at <= 15_000 ? raw : undefined
      const status = !s.enabled ? t.paused : marketDataMode !== 'live' ? t.mock : !running ? t.inactive : t.state[o?.state ?? 'unavailable']
      const holding = positions.find(p => p.id === s.positionId && p.instrumentId === s.instrument.id && p.quoteCurrency === s.instrument.quoteCurrency && p.quantity > 0)
      const analysisUrl = `/my-analysis?${new URLSearchParams({ instrumentId: s.instrument.id, ...(holding ? { positionId: holding.id } : {}) })}`
      const events = store.events.filter(e => e.scenarioId === s.id).slice(-5).reverse()
      return <article key={s.id} className={styles.card} aria-label={`${s.instrument.symbol} ${t.title}`} data-state={s.enabled ? o?.state : undefined}>
        <header><div><small>{s.instrument.marketId === 'upbit' ? 'UPBIT' : 'BINANCE SPOT'} · {s.instrument.quoteCurrency}</small><h3>{s.instrument.symbol}</h3></div><Link to={analysisUrl}>{t.analysis} →</Link></header>
        <strong className={styles.status}>{status}</strong>
        {s.enabled && o?.issue && <p className={styles.caption}>{t.issue[o.issue]}</p>}
        {s.enabled && o?.weakened && <p className={styles.warning}>{t.frame[s.baseline.frame]} · {t.weak}</p>}
        {s.enabled && o?.price != null && <p>{t.price}: <b>{portfolioNumber(o.price)} {s.instrument.quoteCurrency}</b><small> · {t.checked} {new Date(o.at).toLocaleTimeString(language)}</small></p>}
        {!compact && <>
          <dl className={styles.criteria}><div><dt>{t.entryLow} – {t.entryHigh}</dt><dd>{portfolioNumber(s.entry[0])} – {portfolioNumber(s.entry[1])}</dd></div><div><dt>{t.target}</dt><dd>{portfolioNumber(s.target)}</dd></div><div><dt>{t.stop}</dt><dd>{portfolioNumber(s.stop)}</dd></div></dl>
          <small>{t.reference}: {new Date(s.baseline.at).toLocaleString(language)} · {t.bias[s.baseline.direction]} · {t.frame[s.baseline.frame]}</small>
          {s.enabled && o?.weakened === null && <p className={styles.caption}>{t.weakMissing}</p>}
          <div className={styles.actions}>
            <button type="button" disabled={store.error} onClick={() => { try { commit(store.scenarios.map(item => item.id === s.id ? { ...item, enabled: !item.enabled } : item)) } catch { setError(true) } }}>{s.enabled ? t.pause : t.resume}</button>
            <button type="button" disabled={store.error} onClick={() => { setEditing({ value: s, raw: store.raw }); setDeleting(null) }}>{t.edit}</button>
            <button type="button" disabled={store.error} onClick={() => { setDeleting({ id: s.id, raw: store.raw }); setEditing(null) }}>{t.remove}</button>
          </div>
          {editing?.value.id === s.id && <ScenarioForm key={editing.value.revision} initial={editing.value} language={language} onCancel={() => setEditing(null)} onSave={value => {
            commit(store.scenarios.map(item => item.id === value.id ? value : item), value.id, editing.raw); setEditing(null)
          }} />}
          {deleting?.id === s.id && <div className={styles.confirm}><p>{t.confirm}</p><button type="button" onClick={() => { try { commit(store.scenarios.filter(item => item.id !== s.id), s.id, deleting.raw); setDeleting(null) } catch { setError(true) } }}>{t.deleteConfirm}</button><button type="button" onClick={() => setDeleting(null)}>{t.cancel}</button></div>}
          <details><summary>{t.history} ({store.events.filter(e => e.scenarioId === s.id).length})</summary>{events.length ? <ol className={styles.history}>{events.map(e => <li key={e.id}><strong>{t.event[e.kind]}</strong><small>{new Date(e.at).toLocaleString(language)} · {portfolioNumber(e.price)} {s.instrument.quoteCurrency}</small></li>)}</ol> : <p>{t.noHistory}</p>}</details>
        </>}
      </article>
    })}</div>
    <p className={styles.caption}>{t.compactNote}</p>
    {!compact && <details><summary>{t.details}</summary><p className={styles.caption}>{t.fixed} {t.limit}</p><small>{t.local}</small></details>}
  </section>
}
