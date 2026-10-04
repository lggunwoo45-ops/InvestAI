export const CHART_STRUCTURE_PANEL_COLLAPSED_KEY = 'market-copilot.chartStructurePanelCollapsed.v1'

const DEFAULT_COLLAPSED = true

export function loadChartStructurePanelCollapsed() {
  if (typeof window === 'undefined') return DEFAULT_COLLAPSED
  try {
    const stored = window.localStorage.getItem(CHART_STRUCTURE_PANEL_COLLAPSED_KEY)
    if (stored === null) return DEFAULT_COLLAPSED
    if (stored === 'true' || stored === 'false') return stored === 'true'
    window.localStorage.removeItem(CHART_STRUCTURE_PANEL_COLLAPSED_KEY)
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
  return DEFAULT_COLLAPSED
}

export function saveChartStructurePanelCollapsed(collapsed: boolean) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CHART_STRUCTURE_PANEL_COLLAPSED_KEY, String(collapsed))
  } catch {
    // The in-memory preference remains usable when storage is unavailable.
  }
}
