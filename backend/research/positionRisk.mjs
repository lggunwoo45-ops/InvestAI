export const positionEventLabels = { initial: '첫 연결에서 확인', opened: '새 포지션 확인', closed: '이전 포지션이 목록에서 사라짐', resized: '보유 수량 변경', liquidation: '청산 거리 기준 도달', loss: '손실 기준 도달', leverage: '설정 레버리지 기준 도달', resynced: '관측 공백 후 다시 연결' }
export function positionRiskValues(p) {
  return { distance: p.liquidationPrice === null ? null : (p.side === 'long' ? p.currentPrice - p.liquidationPrice : p.liquidationPrice - p.currentPrice) / p.currentPrice * 100, loss: -p.unrealizedPnl / (Math.abs(p.size) * p.entryPrice) * 100, leverage: p.leverage }
}
export function positionBreaches(p, thresholds) {
  const values = positionRiskValues(p)
  return ['distance', 'loss', 'leverage'].filter(k => thresholds[k] !== null && values[k] !== null && (k === 'distance' ? values[k] <= thresholds[k] : values[k] >= thresholds[k]))
}
