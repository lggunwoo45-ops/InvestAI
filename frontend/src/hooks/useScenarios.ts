import { useEffect, useState } from 'react'
import { readScenarios, SCENARIO_CHANGED, SCENARIO_KEY } from '@/services/scenarios/scenarioStorage'

export function useScenarios() {
  const [store, setStore] = useState(readScenarios)
  useEffect(() => {
    const reload = () => setStore(readScenarios())
    const sync = (e: StorageEvent) => { if (e.key === SCENARIO_KEY || e.key === null) reload() }
    window.addEventListener(SCENARIO_CHANGED, reload)
    window.addEventListener('storage', sync)
    reload()
    return () => { window.removeEventListener(SCENARIO_CHANGED, reload); window.removeEventListener('storage', sync) }
  }, [])
  return store
}
