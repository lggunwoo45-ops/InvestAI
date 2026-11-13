import type { ChartOverlayVisibility } from '@/types/chartOverlays'
export interface ChartPreferences { visibility: ChartOverlayVisibility; averages: Record<5 | 20 | 60, boolean> }
export const defaultChartPreferences = (): ChartPreferences => ({ visibility: { supportResistance: true, movingAverage: true, fibonacci: false, user: true }, averages: { 5: true, 20: true, 60: true } })
export function readChartPreferences(key: string): ChartPreferences {
  const defaults = defaultChartPreferences()
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null')
    for (const group of Object.keys(defaults.visibility) as (keyof ChartOverlayVisibility)[]) if (typeof saved?.visibility?.[group] === 'boolean') defaults.visibility[group] = saved.visibility[group]
    for (const period of [5, 20, 60] as const) if (typeof saved?.averages?.[period] === 'boolean') defaults.averages[period] = saved.averages[period]
  } catch { /* Storage is optional. */ }
  return defaults
}
export function saveChartPreferences(key: string, value: ChartPreferences) { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* Keep the current session usable. */ } }
