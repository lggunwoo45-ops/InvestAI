import type { MarketInstrument } from '@/types/market'
import type { AnalysisFrame, Direction } from '@/services/cryptoAnalysis/cryptoDecisionEngine'

export const SCENARIO_KEY = 'investai.scenarios.v1'
export const SCENARIO_CHANGED = 'investai:scenarios-changed'
export const MAX_SCENARIOS = 10
export const MAX_ACTIVE_SCENARIOS = 3
export const eventKinds = ['entry', 'target', 'stop', 'weakened'] as const
export type ScenarioEventKind = typeof eventKinds[number]
export interface Scenario {
  id: string
  revision: string
  instrument: MarketInstrument
  positionId?: string
  createdAt: number
  updatedAt: number
  enabled: boolean
  entry: [number, number]
  target: number
  stop: number
  baseline: { at: number; price: number; direction: Direction; frame: AnalysisFrame; frameDirection: Direction; frameAsOf: number }
}
export interface ScenarioEvent {
  id: string
  scenarioId: string
  revision: string
  kind: ScenarioEventKind
  at: number
  price: number
}
export interface ScenarioData { version: 1; scenarios: Scenario[]; events: ScenarioEvent[] }
export interface ScenarioStore extends ScenarioData { raw: string | null; error: boolean }
const positive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0
const short = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= 160
const direction = (v: unknown) => v === 'buy' || v === 'neutral' || v === 'sell'

/** Only the two supported spot venues; identity fields must agree before any network request. */
export function validScenarioInstrument(value: unknown): value is MarketInstrument {
  if (!value || typeof value !== 'object') return false
  const i = value as MarketInstrument
  if (![i.id, i.symbol, i.name, i.quoteCurrency].every(short) || !/^[A-Z0-9]{2,20}$/.test(i.quoteCurrency)) return false
  if (!positive(i.lastPrice) || ![i.change24hPercent, i.volume24h].every(Number.isFinite) || i.volume24h < 0) return false
  if (i.marketId === 'upbit') {
    const [asset, quote, extra] = i.symbol.split('/')
    return !extra && /^[A-Z0-9]{1,30}$/.test(asset) && ['KRW', 'BTC', 'USDT'].includes(quote) && quote === i.quoteCurrency
      && i.id === (quote === 'KRW' ? `upbit-${asset.toLowerCase()}` : `upbit-${quote.toLowerCase()}-${asset.toLowerCase()}`)
      && (i.providerSymbol === undefined || i.providerSymbol === `${quote}-${asset}`)
      && (i.marketType === undefined || i.marketType === `upbit-${quote.toLowerCase()}`)
  }
  return i.marketId === 'binance-spot' && /^[A-Z0-9]{3,40}$/.test(i.symbol) && i.symbol.endsWith(i.quoteCurrency)
    && i.id === `binance-spot-${i.symbol.toLowerCase()}` && (i.providerSymbol === undefined || i.providerSymbol === i.symbol)
    && (i.marketType === undefined || i.marketType === 'binance-spot')
}

export function validScenario(value: unknown): value is Scenario {
  if (!value || typeof value !== 'object') return false
  const s = value as Scenario, b = s.baseline
  return short(s.id) && short(s.revision) && validScenarioInstrument(s.instrument) && (s.positionId === undefined || short(s.positionId))
    && typeof s.enabled === 'boolean' && positive(s.createdAt) && positive(s.updatedAt) && s.updatedAt >= s.createdAt
    && Array.isArray(s.entry) && s.entry.length === 2 && s.entry.every(positive) && positive(s.stop) && positive(s.target)
    && s.stop < s.entry[0] && s.entry[0] <= s.entry[1] && s.entry[1] < s.target
    && !!b && positive(b.at) && b.at <= s.updatedAt && positive(b.price) && direction(b.direction) && direction(b.frameDirection)
    && ['1H', '4H', '1D'].includes(b.frame) && positive(b.frameAsOf) && b.frameAsOf <= b.at
}

export function validScenarioData(value: unknown): value is ScenarioData {
  if (!value || typeof value !== 'object') return false
  const d = value as ScenarioData
  return d.version === 1 && Array.isArray(d.scenarios) && d.scenarios.length <= MAX_SCENARIOS && d.scenarios.every(validScenario)
    && d.scenarios.filter(s => s.enabled).length <= MAX_ACTIVE_SCENARIOS
    && new Set(d.scenarios.map(s => s.id)).size === d.scenarios.length
    && new Set(d.scenarios.map(s => s.instrument.id)).size === d.scenarios.length
    && Array.isArray(d.events) && d.events.length <= 60 && new Set(d.events.map(e => e?.id)).size === d.events.length
    && d.events.every(e => e && short(e.id) && short(e.scenarioId) && short(e.revision) && eventKinds.includes(e.kind) && positive(e.at) && positive(e.price)
      && d.scenarios.some(s => s.id === e.scenarioId && s.revision === e.revision && e.at >= s.updatedAt))
}

export function readScenarios(): ScenarioStore {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(SCENARIO_KEY)
    const data: unknown = raw === null ? { version: 1, scenarios: [], events: [] } : JSON.parse(raw)
    if (!validScenarioData(data)) throw new Error('storage')
    return { ...data, raw, error: false }
  } catch { return { version: 1, scenarios: [], events: [], raw, error: true } }
}

export function writeScenarios(data: ScenarioData, expectedRaw: string | null): ScenarioStore {
  if (!validScenarioData(data)) throw new Error('validation')
  const current = readScenarios()
  if (current.error) throw new Error('storage')
  if (current.raw !== expectedRaw) throw new Error('conflict')
  const raw = JSON.stringify({ version: 1, scenarios: data.scenarios, events: data.events })
  localStorage.setItem(SCENARIO_KEY, raw)
  window.dispatchEvent(new Event(SCENARIO_CHANGED))
  return { ...data, raw, error: false }
}

/** Small, public identity snapshot, without persisting quotes as future live observations. */
export function scenarioInstrument(i: MarketInstrument): MarketInstrument {
  return { id: i.id, marketId: i.marketId, symbol: i.symbol, name: i.name, quoteCurrency: i.quoteCurrency,
    providerSymbol: i.providerSymbol, marketType: i.marketType, lastPrice: i.lastPrice, change24hPercent: 0, volume24h: 0 }
}
