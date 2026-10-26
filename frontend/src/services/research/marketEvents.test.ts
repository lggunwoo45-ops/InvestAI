import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchEconomicCalendar, fetchLiquidations, upcomingEvents, type EconomicCalendar } from './marketEvents'

afterEach(() => vi.unstubAllGlobals())
const at = Date.parse('2026-10-26T00:00:00Z')
export const calendarFixture: EconomicCalendar = { version: 1, fetchedAt: at, windowStart: at - 86400000, windowEnd: at + 90 * 86400000,
  sources: ['bls', 'fed'].map(id => ({ id: id as 'bls' | 'fed', name: id, url: 'https://example.com', status: 'available', fetchedAt: at, eventCount: 1 })),
  events: [
    { id: 'fed:1', source: 'fed', title: '미국 FOMC 회의', originalTitle: 'FOMC meeting', at: null, date: '2026-10-27', endDate: '2026-10-28', kind: 'meeting', timeZone: 'America/New_York' },
    { id: 'bls:1', source: 'bls', title: '미국 고용보고서', originalTitle: 'Employment Situation', at: Date.parse('2026-11-06T13:30:00Z'), date: null, endDate: null, kind: 'release', timeZone: 'America/New_York' },
  ] }
describe('public market event client', () => {
  it('uses fixed routes without credentials, validates sources and respects explicit date-only events', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(calendarFixture), { headers: { Date: new Date(at).toUTCString() } }))
    vi.stubGlobal('fetch', fetchMock)
    const result = await fetchEconomicCalendar()
    expect(result.events[0]?.at).toBeNull()
    expect(fetchMock.mock.calls[0]).toEqual(['/api/research/calendar', expect.objectContaining({ credentials: 'omit', redirect: 'error' })])
    expect(upcomingEvents(result, Date.parse('2026-10-29T02:00:00Z'), 30).map(e => e.source)).toEqual(['fed', 'bls']) // Still Oct 28 in Eastern time.
    expect(upcomingEvents(result, Date.parse('2026-10-29T05:00:00Z'), 30).map(e => e.source)).toEqual(['bls'])
    expect(upcomingEvents(result, at, 7, 'bls')).toEqual([])
  })
  it('rejects malformed data and invalid assets before displaying any values', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ...calendarFixture, events: [{ ...calendarFixture.events[0], date: '2026-02-30' }] })))
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchEconomicCalendar()).rejects.toThrow('일정 자료 형식')
    await expect(fetchLiquidations('BTC&url=evil')).rejects.toThrow('지원하지 않는')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ version: 1, fetchedAt: at, asset: 'BTC', status: 'live', windows: [] })))
    await expect(fetchLiquidations('BTC')).rejects.toThrow('청산 자료 형식')
  })
})
