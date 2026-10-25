import { describe, expect, it } from 'vitest'
import { buildResearchResume } from './researchResume'
import type { ResearchObservation } from './researchJournal'

const review = (asset: string, at: number): ResearchObservation => ({ id: `${asset}-${at}`, asset, at, price: 100, note: asset, funding: null, interest: null, volatility: null, signals: [] })
describe('saved research grouped for home', () => {
  it('prioritizes unfinished notes, then the newest record, with one card per asset', () => {
    const records = [review('BTC', 100), review('ETH', 300), review('BTC', 200)]
    const rules = [{ asset: 'SOL', above: 110, below: null }]
    const events = [{ id: 'event', asset: 'ETH', at: 400, price: 120, kind: 'above' as const }]
    const result = buildResearchResume(records, rules, events, { BTC: 'finish this', XRP: '   ' })
    expect(result.map(item => item.asset)).toEqual(['BTC', 'ETH', 'SOL'])
    expect(result[0]?.review?.at).toBe(200)
    expect(result[1]?.event?.at).toBe(400)
    expect(result[2]?.review).toBeUndefined()
    expect(records.map(record => record.at)).toEqual([100, 300, 200])
  })
  it('does not create broken routes for unsupported assets or invalid record dates', () => {
    expect(buildResearchResume([review('UNKNOWN', 100), review('BTC', 1e30)], [], [{ id: 'bad', asset: 'ETH', at: -1, price: 100, kind: 'above' }], { UNKNOWN: 'draft' })).toEqual([])
  })
})
