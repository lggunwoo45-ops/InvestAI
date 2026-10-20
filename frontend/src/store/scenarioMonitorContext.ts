import { createContext, useContext } from 'react'
import type { ScenarioObservation } from '@/services/scenarios/scenarioTracking'

export const ScenarioMonitorContext = createContext<{ observations: Record<string, ScenarioObservation>; running: boolean; historyError: boolean }>({ observations: {}, running: false, historyError: false })
export const useScenarioMonitor = () => useContext(ScenarioMonitorContext)
