import { researchBase } from './researchClient'
import { rememberResearchClock } from './researchClock'
import { researchAssets } from './researchModel'

export interface LiquidationEvent { id: string; asset: string; at: number; side: 'long' | 'short'; size: number; bankruptcyPrice: number; notional: number }
export interface LiquidationWindow { minutes: number; count: number; long: number; short: number; complete: boolean }
export interface Liquidations { version: 1; asset: string; fetchedAt: number; status: 'connecting' | 'live' | 'disconnected'; startedAt: number | null; continuousSince: number | null; lastMessageAt: number | null; reconnects: number; windows: LiquidationWindow[]; events: LiquidationEvent[] }
export interface EconomicEvent { id: string; source: 'bls' | 'fed'; title: string; originalTitle: string; at: number | null; date: string | null; endDate: string | null; kind: 'release' | 'meeting'; timeZone: 'America/New_York' }
export interface EconomicSource { id: 'bls' | 'fed'; name: string; url: string; status: 'available' | 'stale' | 'unavailable'; fetchedAt: number | null; eventCount: number; via?: 'nyfed'; coverageEnd?: number }
export interface EconomicCalendar { version: 1; fetchedAt: number; windowStart: number; windowEnd: number; events: EconomicEvent[]; sources: EconomicSource[] }
export const economicSourceLinks = { bls: 'https://www.bls.gov/schedule/news_release/', fed: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm' }
export const nyFedCalendarLink = 'https://www.newyorkfed.org/research/calendars/nationalecon_cal.html'
export const simpleCalendarTitles = new Set(['Consumer Price Index', 'Employment Situation', 'Producer Price Index', 'Job Openings and Labor Turnover Survey', 'Employment Cost Index', 'Productivity and Costs', 'U.S. Import and Export Price Indexes'])
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0
const nullableTime = (value: unknown) => value === null || finite(value)
const date = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
async function fetchEvents(path: string, signal?: AbortSignal) {
  const started = performance.now()
  const response = await fetch(`${researchBase()}/${path}`, { credentials: 'omit', redirect: 'error', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000) })
  if (!response.ok) throw new Error(response.status === 429 ? '조회가 많아 잠시 쉬고 있어요. 곧 다시 확인합니다.' : '자료를 불러오지 못했어요. 연결을 다시 확인하고 있습니다.')
  const text = await response.text()
  if (text.length > 500_000) throw new Error('자료 크기를 확인할 수 없습니다.')
  const value = JSON.parse(text)
  if (value?.version !== 1 || !finite(value.fetchedAt)) throw new Error('자료 형식을 확인할 수 없습니다.')
  return { value, date: response.headers.get('date'), started }
}
export async function fetchLiquidations(asset: string, signal?: AbortSignal): Promise<Liquidations> {
  if (!researchAssets.some(a => a === asset)) throw new Error('지원하지 않는 종목입니다.')
  const { value: v, date, started } = await fetchEvents(`liquidations?asset=${encodeURIComponent(asset)}`, signal)
  if (v.asset !== asset || !['connecting', 'live', 'disconnected'].includes(v.status) || ![v.startedAt, v.continuousSince, v.lastMessageAt].every(nullableTime) || !Number.isSafeInteger(v.reconnects) || v.reconnects < 0 || !Array.isArray(v.windows) || v.windows.length !== 3 || v.windows.some((w: LiquidationWindow, i: number) => !w || w.minutes !== [1, 5, 15][i] || ![w.long, w.short].every(finite) || !Number.isSafeInteger(w.count) || w.count < 0 || typeof w.complete !== 'boolean') || !Array.isArray(v.events) || v.events.length > 50 || v.events.some((e: LiquidationEvent) => !e || typeof e.id !== 'string' || e.asset !== asset || !finite(e.at) || !['long', 'short'].includes(e.side) || ![e.size, e.bankruptcyPrice, e.notional].every(n => finite(n) && n > 0))) throw new Error('청산 자료 형식을 확인할 수 없습니다.')
  return rememberResearchClock(v as Liquidations, date, started)
}
export async function fetchEconomicCalendar(signal?: AbortSignal): Promise<EconomicCalendar> {
  const { value: v, date: serverDate, started } = await fetchEvents('calendar', signal)
  if (Array.isArray(v.sources) && v.sources.some((s: EconomicSource) => s && (s.via !== undefined || s.coverageEnd !== undefined) && (s.id !== 'bls' || s.via !== 'nyfed' || !finite(s.coverageEnd) || !finite(s.fetchedAt) || s.coverageEnd <= s.fetchedAt))) throw new Error('일정 출처를 확인할 수 없습니다.')
  if (![v.windowStart, v.windowEnd].every(finite) || !Array.isArray(v.sources) || v.sources.length !== 2 || new Set(v.sources.map((s: EconomicSource) => s?.id)).size !== 2 || v.sources.some((s: EconomicSource) => !s || !['bls', 'fed'].includes(s.id) || !['available', 'stale', 'unavailable'].includes(s.status) || !nullableTime(s.fetchedAt)) || !Array.isArray(v.events) || v.events.length > 300 || v.events.some((e: EconomicEvent) => !e || typeof e.id !== 'string' || typeof e.title !== 'string' || e.title.length > 300 || !['bls', 'fed'].includes(e.source) || e.timeZone !== 'America/New_York' || (e.kind === 'release' ? !finite(e.at) || e.date !== null || e.endDate !== null : e.kind !== 'meeting' || e.at !== null || !date(e.date) || !date(e.endDate) || e.endDate < e.date))) throw new Error('일정 자료 형식을 확인할 수 없습니다.')
  return rememberResearchClock(v as EconomicCalendar, serverDate, started)
}
export function upcomingEvents(calendar: EconomicCalendar, now: number, days: number, source = 'all') {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const end = new Date(now + days * 86_400_000).toISOString().slice(0, 10)
  return calendar.events.filter(e => (source === 'all' || e.source === source) && (e.at !== null ? e.at >= now && e.at <= now + days * 86_400_000 : e.endDate! >= today && e.date! <= end))
}
