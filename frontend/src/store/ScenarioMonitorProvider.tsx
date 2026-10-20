import { useCallback, useEffect, useEffectEvent, useRef, useState, type PropsWithChildren } from 'react'
import { useScenarios } from '@/hooks/useScenarios'
import { useTechnicalLevelData } from '@/hooks/useTechnicalLevelData'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useLanguage } from '@/i18n/useLanguage'
import { readScenarios, writeScenarios, type Scenario, type ScenarioEvent } from '@/services/scenarios/scenarioStorage'
import { observeScenario, scenarioTransitions, type ScenarioObservation } from '@/services/scenarios/scenarioTracking'
import { scenarioCopy } from '@/components/scenarios/scenarioCopy'
import styles from '@/components/scenarios/Scenarios.module.css'
import { ScenarioMonitorContext } from './scenarioMonitorContext'

function ScenarioSensor({ scenario, publish }: { scenario: Scenario; publish: (id: string, observation: ScenarioObservation | null, events: ScenarioEvent[]) => void }) {
  const data = useTechnicalLevelData(scenario.instrument, scenario.baseline.frame)
  const previous = useRef<ScenarioObservation | null>(null)
  const sample = useEffectEvent(() => {
    const now = Date.now()
    const current = observeScenario(scenario, data, now)
    const events = scenarioTransitions(previous.current, current).map(kind => ({ id: crypto.randomUUID(), scenarioId: scenario.id, revision: scenario.revision, kind, at: now, price: current.price! }))
    previous.current = current
    publish(scenario.id, current, events)
  })
  useEffect(() => {
    sample()
    const timer = setInterval(sample, 5_000)
    return () => { clearInterval(timer); publish(scenario.id, null, []) }
  }, [scenario.id, publish])
  return null
}

export function ScenarioMonitorProvider({ children }: PropsWithChildren) {
  const store = useScenarios()
  const { marketDataMode } = useMarketWorkspace()
  const { language } = useLanguage()
  const [visible, setVisible] = useState(() => document.visibilityState !== 'hidden')
  const [observations, setObservations] = useState<Record<string, ScenarioObservation>>({})
  const [notice, setNotice] = useState<{ symbol: string; events: ScenarioEvent[] } | null>(null)
  const [historyError, setHistoryError] = useState(false)
  useEffect(() => {
    const update = () => { setVisible(document.visibilityState !== 'hidden'); setNotice(null) }
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  const publish = useCallback((id: string, observation: ScenarioObservation | null, events: ScenarioEvent[]) => {
    setObservations(values => {
      const next = { ...values }
      if (observation) next[id] = observation
      else delete next[id]
      return next
    })
    // Retract a no-longer-supported ready alert permanently; reconnecting must
    // not bring an old ready notification back without a new observed change.
    if (observation?.entryReview.status !== 'ready') setNotice(value => {
      if (!value) return value
      const remaining = value.events.filter(e => e.scenarioId !== id || e.kind !== 'ready')
      return remaining.length === value.events.length ? value : remaining.length ? { ...value, events: remaining } : null
    })
    if (!events.length) return
    const current = readScenarios()
    const scenario = current.scenarios.find(s => s.id === id && s.enabled && s.revision === observation?.revision)
    if (current.error || !scenario) return
    // Repeated boundary oscillations do not flood alerts; cooldown survives reloads.
    const fresh = events.filter(e => !current.events.some(old => old.scenarioId === id && old.revision === e.revision && old.kind === e.kind && e.at - old.at < 300_000))
    if (!fresh.length) return
    try {
      writeScenarios({ version: 1, scenarios: current.scenarios, events: [...current.events, ...fresh].slice(-60) }, current.raw)
      setHistoryError(false)
      setNotice({ symbol: scenario.instrument.symbol, events: fresh })
    } catch { setHistoryError(true) }
  }, [])
  const running = visible && marketDataMode === 'live' && !store.error
  const t = scenarioCopy[language]
  const activeNotice = notice?.events.filter(e => store.scenarios.some(s => s.id === e.scenarioId && s.revision === e.revision && s.enabled)
    && (e.kind !== 'ready' || observations[e.scenarioId]?.entryReview.status === 'ready')) ?? []
  return <ScenarioMonitorContext value={{ observations, running, historyError }}>
    {children}
    {running && store.scenarios.filter(s => s.enabled).map(s => <ScenarioSensor key={`${s.id}:${s.revision}`} scenario={s} publish={publish} />)}
    {running && notice && activeNotice.length > 0 && <aside className={styles.toast} aria-label={t.notice}>
      <div role="status"><strong>{notice.symbol}</strong><p>{activeNotice.map(e => t.event[e.kind]).join(' · ')}</p><small>{new Date(activeNotice[0].at).toLocaleTimeString(language)}</small></div>
      <button type="button" onClick={() => setNotice(null)} aria-label={t.dismiss}>×</button>
    </aside>}
  </ScenarioMonitorContext>
}
