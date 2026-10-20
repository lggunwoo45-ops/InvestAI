import { useState } from 'react'
import type { Language } from '@/i18n/translations'
import { validScenario, type Scenario } from '@/services/scenarios/scenarioStorage'
import { scenarioCopy } from './scenarioCopy'
import styles from './Scenarios.module.css'

export function ScenarioForm({ initial, language, onSave, onCancel }: { initial: Scenario; language: Language; onSave: (value: Scenario) => void; onCancel: () => void }) {
  const t = scenarioCopy[language]
  const [values, setValues] = useState({ entryLow: String(initial.entry[0]), entryHigh: String(initial.entry[1]), target: String(initial.target), stop: String(initial.stop) })
  const [enabled, setEnabled] = useState(initial.enabled)
  const [error, setError] = useState(false)
  return <form className={styles.form} aria-label={t.title} onSubmit={e => {
    e.preventDefault()
    const value: Scenario = { ...initial, entry: [Number(values.entryLow), Number(values.entryHigh)], target: Number(values.target), stop: Number(values.stop), enabled, updatedAt: Date.now(), revision: crypto.randomUUID() }
    try { if (!validScenario(value)) throw new Error('validation'); onSave(value) } catch { setError(true) }
  }}>
    <p>{t.reference}: {new Date(initial.baseline.at).toLocaleString(language)} · {t.bias[initial.baseline.direction]} · {t.frame[initial.baseline.frame]}</p>
    <div className={styles.fields}>{(['entryLow', 'entryHigh', 'target', 'stop'] as const).map(field => <label key={field}>{t[field]} ({initial.instrument.quoteCurrency})<input required type="number" step="any" min="0" value={values[field]} onChange={e => setValues({ ...values, [field]: e.target.value })} /></label>)}</div>
    <p>{t.order}</p><p>{t.editNote}</p>
    <label className={styles.check}><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />{t.enabled}</label>
    {error && <p role="alert">{t.error}</p>}
    <div className={styles.actions}><button type="submit">{t.save}</button><button type="button" onClick={onCancel}>{t.cancel}</button></div>
  </form>
}
