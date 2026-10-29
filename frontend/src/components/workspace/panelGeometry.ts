export const clampPanelSize = (value: number, min: number, max: number) => Math.min(Math.max(min, max), Math.max(min, value))

export function marketPanelGeometry(width: number, list: number, trades: number, collapsed: boolean, hasList: boolean, hasTrades: boolean) {
  const layout = width > 0 && width < 820 ? 'narrow' : width >= 1200 || width === 0 ? 'wide' : 'below'
  width = width || 1440
  const tradeMax = Math.max(240, Math.min(480, width - (hasList ? collapsed ? 56 : 240 : 0) - 520 - 20))
  const tradeWidth = clampPanelSize(trades, 240, tradeMax)
  const listMax = Math.max(240, Math.min(520, width - 500 - (layout === 'wide' && hasTrades ? tradeWidth + 10 : 0) - 10))
  return { layout, tradeMax, tradeWidth, listMax, listWidth: collapsed ? 56 : clampPanelSize(list, 240, listMax) }
}
