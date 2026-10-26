import { useEffect, useState } from 'react'
import { readScenarios, SCENARIO_CHANGED, SCENARIO_KEY } from '@/services/scenarios/scenarioStorage'
import { CLOUD_RECORDS_CHANGED } from '@/services/cloud/cloudClient'

export function useScenarios() {
  const [store, setStore] = useState(readScenarios)
  useEffect(() => {
    const reload = () => setStore(readScenarios())
    const sync = (e: StorageEvent) => { if (e.key === SCENARIO_KEY || e.key === null) reload() }
    window.addEventListener(SCENARIO_CHANGED, reload)
    window.addEventListener(CLOUD_RECORDS_CHANGED, reload)
    window.addEventListener('storage', sync)
    reload()
    return () => { window.removeEventListener(SCENARIO_CHANGED, reload); window.removeEventListener(CLOUD_RECORDS_CHANGED, reload); window.removeEventListener('storage', sync) }
  }, [])
  return store
}
