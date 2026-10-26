import { boundedCalendarText } from './calendarIO.mjs'

export const savedCalendarUrl = 'https://raw.githubusercontent.com/lggunwoo45-ops/InvestAI/calendar-data/bls.json'
export const nyFedCalendarUrl = 'https://www.newyorkfed.org/research/calendars/nationalecon_cal.html'
export const majorBlsReleases = {
  cpi: ['Consumer Price Index', '미국 소비자물가지수 (CPI)'],
  jobs: ['Employment Situation', '미국 고용보고서'],
  ppi: ['Producer Price Index', '미국 생산자물가지수 (PPI)'],
  jolts: ['Job Openings and Labor Turnover Survey', '미국 구인·이직 보고서 (JOLTS)'],
  eci: ['Employment Cost Index', '미국 고용비용지수'],
  productivity: ['Productivity and Costs', '미국 생산성·비용'],
  tradePrices: ['U.S. Import and Export Price Indexes', '미국 수출입물가지수'],
}
const day = 86_400_000
const finite = n => typeof n === 'number' && Number.isFinite(n) && n > 0
export function validateCalendarSnapshot(value, now = Date.now()) {
  if (value?.version !== 1 || value.provider !== 'nyfed' || value.sourceUrl !== nyFedCalendarUrl || !finite(value.collectedAt) || value.collectedAt > now + 300_000 || now - value.collectedAt > day || !finite(value.coverageStart) || !finite(value.coverageEnd) || value.coverageStart > value.collectedAt || value.coverageStart < value.collectedAt - 32 * day || value.coverageEnd <= value.collectedAt || value.coverageEnd > value.collectedAt + 125 * day || !Array.isArray(value.events) || !value.events.length || value.events.length > 120) throw new Error('invalid_saved_calendar')
  const ids = new Set()
  for (const event of value.events) {
    const release = event && Object.hasOwn(majorBlsReleases, event.releaseKey) ? majorBlsReleases[event.releaseKey] : null
    if (!release || event.source !== 'bls' || event.kind !== 'release' || event.timeZone !== 'America/New_York' || event.originalTitle !== release[0] || event.title !== release[1] || !finite(event.at) || event.at < value.coverageStart || event.at > value.coverageEnd || event.date !== null || event.endDate !== null || event.id !== `bls:nyfed:${event.releaseKey}:${event.at}` || ids.has(event.id)) throw new Error('invalid_saved_calendar')
    ids.add(event.id)
  }
  return value
}
export function createSavedCalendarReader({ fetchImpl = fetch, now = Date.now } = {}) {
  return async signal => {
    const response = await fetchImpl(savedCalendarUrl, { redirect: 'error', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000), headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error('saved_calendar_unavailable')
    return validateCalendarSnapshot(JSON.parse(await boundedCalendarText(response, 100_000)), now())
  }
}
