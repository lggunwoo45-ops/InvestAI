import { useState } from 'react'
import type { MarketInstrument } from '@/types/market'
import type { Language } from '@/i18n/translations'
import type { CryptoDecision } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import { useScenarios } from '@/hooks/useScenarios'
import { MAX_ACTIVE_SCENARIOS, scenarioInstrument, validScenarioInstrument, writeScenarios, type Scenario } from '@/services/scenarios/scenarioStorage'
import { ScenarioForm } from './ScenarioForm'
import { scenarioCopy } from './scenarioCopy'
import styles from './Scenarios.module.css'

export function SaveScenario({ instrument, decision, language, positionId }: { instrument: MarketInstrument; decision: CryptoDecision; language: Language; positionId?: string }) {
  const store = useScenarios()
  const [editing, setEditing] = useState<{ value: Scenario; raw: string | null } | null>(null)
  const [saved, setSaved] = useState(false)
  const t = scenarioCopy[language]
  const previous = store.scenarios.find(s => s.instrument.id === instrument.id)
  const frame = decision.frames.find(f => f.frame === decision.plan?.frame)
  const eligible = validScenarioInstrument(instrument) && decision.plan && decision.direction !== 'unavailable' && decision.price !== null && frame && !frame.issue && frame.asOf !== null
  if (!eligible && !editing) return null
  return <div className={styles.save}>
    {!editing && <button type="button" disabled={store.error || !eligible} onClick={() => {
      if (!decision.plan || decision.price === null || decision.direction === 'unavailable' || !frame?.asOf) return
      const now = Date.now()
      setSaved(false)
      setEditing({ raw: store.raw, value: {
        id: previous?.id ?? crypto.randomUUID(), revision: crypto.randomUUID(), instrument: scenarioInstrument(instrument), positionId,
        createdAt: previous?.createdAt ?? now, updatedAt: now, entry: [...decision.plan.entry], target: decision.plan.target, stop: decision.plan.stop,
        enabled: previous?.enabled ?? store.scenarios.filter(s => s.enabled).length < MAX_ACTIVE_SCENARIOS,
        baseline: { at: now, price: decision.price, direction: decision.direction, frame: frame.frame, frameDirection: frame.direction, frameAsOf: frame.asOf },
      } })
    }}>{previous ? t.replaceAnalysis : t.saveAnalysis}</button>}
    {editing && <ScenarioForm initial={editing.value} language={language} onCancel={() => setEditing(null)} onSave={value => {
      const scenarios = store.scenarios.some(s => s.id === value.id) ? store.scenarios.map(s => s.id === value.id ? value : s) : [...store.scenarios, value]
      writeScenarios({ version: 1, scenarios, events: store.events.filter(e => e.scenarioId !== value.id) }, editing.raw)
      setEditing(null); setSaved(true)
    }} />}
    {store.error && <p role="alert">{t.storage}</p>}
    {saved && <p role="status">{t.saved}</p>}
    <small>{t.scope}</small>
  </div>
}
