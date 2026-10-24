import { beforeEach, describe, expect, it } from 'vitest'
import { checkRules, readEvents, readObservations, saveEvents, saveObservation, type ResearchObservation } from './researchJournal'
const entry: ResearchObservation = { id: 'a', asset: 'BTC', at: 1000, price: 100, funding: null, interest: 2, volatility: 1, signals: ['aboveMean'], note: 'first' }
describe('review baselines and alert observations', () => {
  beforeEach(() => localStorage.clear())
  it('preserves the old baseline after a new review and survives reload', () => {
    saveObservation(entry); saveObservation({ ...entry, id: 'b', at: 2000, price: 110 })
    expect(readObservations().map(r => r.price)).toEqual([110, 100])
    expect(readObservations()[1]!.funding).toBeNull()
  })
  it('rejects corrupt storage and propagates failed writes instead of claiming success', () => {
    expect(readObservations({ getItem: () => '{' })).toEqual([])
    expect(() => saveObservation(entry, { getItem: () => '[]', setItem: () => { throw new Error('quota') } })).toThrow('quota')
  })
  it('records crossings only, not repeated conditions or initial observations', () => {
    const rules = [{ asset: 'BTC', above: 110, below: 90 }]
    expect(checkRules(rules, 'BTC', undefined, 120, 1000)).toEqual([])
    expect(checkRules(rules, 'BTC', 100, 110, 1000)[0]?.kind).toBe('above')
    expect(checkRules(rules, 'BTC', 110, 120, 2000)).toEqual([])
    expect(checkRules(rules, 'ETH', 100, 80, 1000)).toEqual([])
    expect(checkRules(rules, 'BTC', 100, 80, 1000)[0]?.kind).toBe('below')
  })
  it('keeps only one record for the same observation and preserves its original context', () => {
    const triggered = checkRules([{ asset: 'BTC', above: 110, below: null, review: entry }], 'BTC', 100, 112, 2000)
    saveEvents(triggered); saveEvents(triggered)
    expect(readEvents()).toHaveLength(1)
    expect(readEvents()[0]).toMatchObject({ threshold: 110, review: { id: 'a', note: 'first' } })
  })
})
