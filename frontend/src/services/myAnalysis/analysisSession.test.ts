import { afterEach, describe, expect, it, vi } from 'vitest'
import { ANALYSIS_SESSION_KEY, readAnalysisSession, saveAnalysisSession } from './analysisSession'

afterEach(() => { sessionStorage.clear(); vi.restoreAllMocks() })
describe('analysis navigation memory', () => {
  it('ignores corrupt and unsupported saved drafts', () => {
    for (const value of ['broken', 'null', '{}', JSON.stringify({ query: 'instrumentId=btc', tab: 'unknown' })]) {
      sessionStorage.setItem(ANALYSIS_SESSION_KEY, value)
      expect(readAnalysisSession()).toBeNull()
    }
  })
  it('does not break analysis when browser storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(readAnalysisSession()).toBeNull()
    expect(() => saveAnalysisSession({ query: 'instrumentId=btc', tab: 'summary', intent: 'watching', note: '', averagePrice: '', positionBasis: '' })).not.toThrow()
  })
})
