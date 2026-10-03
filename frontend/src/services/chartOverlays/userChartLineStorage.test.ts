import { beforeEach, describe, expect, it } from 'vitest'

import {
  createUserChartLine,
  loadUserChartLines,
  saveUserChartLines,
  USER_CHART_LINE_STORAGE_KEY,
} from './userChartLineStorage'

describe('userChartLineStorage', () => {
  beforeEach(() => window.localStorage.clear())

  it.each([
    '"hello"',
    '42',
    '{}',
    '{"schemaVersion":2,"linesByInstrument":{}}',
    '{"schemaVersion":1,"linesByInstrument":{"btc":[{"id":"bad"}]}}',
    '{not-json',
  ])('removes a corrupt runtime payload and returns an empty state: %s', (raw) => {
    localStorage.setItem(USER_CHART_LINE_STORAGE_KEY, raw)
    expect(loadUserChartLines('btc')).toEqual([])
    expect(localStorage.getItem(USER_CHART_LINE_STORAGE_KEY)).toBeNull()
  })

  it('roundtrips lines per instrument without overwriting another instrument', () => {
    const btc = createUserChartLine('btc', { label: 'BTC reference', price: 100 }, { id: 'btc-line', now: '2026-10-03T00:00:00.000Z' })
    const eth = createUserChartLine('eth', { label: 'ETH reference', price: 50 }, { id: 'eth-line', now: '2026-10-03T00:00:00.000Z' })
    expect(btc).not.toBeNull()
    expect(eth).not.toBeNull()
    saveUserChartLines('btc', [btc!])
    saveUserChartLines('eth', [eth!])
    expect(loadUserChartLines('btc')).toEqual([btc])
    expect(loadUserChartLines('eth')).toEqual([eth])
  })

  it('preserves a hidden user line and never stores calculated automatic overlays', () => {
    const hidden = createUserChartLine('btc', { label: 'Hidden review', price: 80 }, { id: 'hidden', now: '2026-10-03T00:00:00.000Z' })
    expect(hidden).not.toBeNull()
    saveUserChartLines('btc', [{ ...hidden!, visible: false }])
    expect(loadUserChartLines('btc')[0]?.visible).toBe(false)
    const raw = localStorage.getItem(USER_CHART_LINE_STORAGE_KEY) ?? ''
    expect(raw).not.toContain('support-1')
    expect(raw).not.toContain('moving-average')
    expect(raw).not.toContain('fibonacci-')
  })

  it('rejects empty labels and invalid prices instead of fabricating a line', () => {
    expect(createUserChartLine('btc', { label: ' ', price: 100 })).toBeNull()
    expect(createUserChartLine('btc', { label: 'Reference', price: 0 })).toBeNull()
    expect(createUserChartLine('btc', { label: 'Reference', price: Number.NaN })).toBeNull()
  })
})
