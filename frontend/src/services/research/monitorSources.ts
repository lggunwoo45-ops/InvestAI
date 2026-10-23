import type { Scenario } from '@/services/scenarios/scenarioStorage'
import type { ResearchObservation } from './researchJournal'
import type { MonitorConfig } from './monitorClient'

export interface MonitorSource { key: string; label: string; instrument: MonitorConfig['instrument']; source: MonitorConfig['source']; entry: [number, number]; target?: number; stop?: number }
export function scenarioSource(s: Scenario): MonitorSource {
  const quote = s.instrument.quoteCurrency
  const asset = s.instrument.marketId === 'upbit' ? s.instrument.symbol.split('/')[0] : s.instrument.symbol.slice(0, -quote.length)
  return { key: `scenario:${s.id}`, label: `시나리오 · ${s.instrument.symbol} · ${s.instrument.marketId}`, instrument: { venue: s.instrument.marketId === 'upbit' ? 'upbit' : 'binance-spot', asset, quote }, source: { kind: 'scenario', id: s.id, revision: s.revision, at: s.baseline.at, price: s.baseline.price, note: `${s.baseline.frame} 기준 ${s.baseline.direction} · 봉 시각 ${new Date(s.baseline.frameAsOf).toISOString()}${s.positionId ? ' · 보유 기록 연결' : ''}`, signals: [s.baseline.frameDirection], ...(s.positionId ? { positionId: s.positionId } : {}) }, entry: [...s.entry], target: s.target, stop: s.stop }
}
export function reviewSource(r: ResearchObservation): MonitorSource {
  return { key: `review:${r.id}`, label: `검토 · ${r.asset} · ${new Date(r.at).toLocaleString('ko-KR')}`, instrument: { venue: 'binance-futures', asset: r.asset, quote: 'USDT' }, source: { kind: 'review', id: r.id, revision: r.id, at: r.at, price: r.price, note: r.note, signals: [...r.signals], metrics: { funding: r.funding, interest: r.interest, volatility: r.volatility } }, entry: [r.price, r.price] }
}
