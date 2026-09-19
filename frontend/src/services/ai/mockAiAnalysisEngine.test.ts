import { describe, expect, it, vi } from 'vitest'

import type { AiAnalysisInput } from '@/types/aiAnalysis'
import { createMockAiAnalysis } from './mockAiAnalysisEngine'

const input: AiAnalysisInput = {
  instrument: { id: 'upbit-xrp', symbol: 'XRP/KRW', name: 'XRP', marketId: 'upbit', marketLabel: 'Upbit', assetType: 'crypto' },
  quote: { currentPrice: 4_126, change24h: -0.72, volume24h: 68_330_000_000, quoteStatus: 'available' },
  marketContext: { marketType: 'upbit-krw', providerMode: 'mock', isLive: false, sessionStatus: 'always-open' },
  newsContext: { providerMode: 'mock', providerStatus: 'mock', relatedNewsCount: 1, relatedHeadlines: ['Demo headline'], isDemoOnly: true, isRealNewsAvailable: false },
  scenarioContext: { marketBias: 'mixed', confidence: null, timeframe: 'short', scenarioMap: { bullish: 'Watch momentum.', neutral: 'Watch range.', bearish: 'Watch risk.' }, evidenceState: 'demo' },
  missingInputs: { realAi: true, realNewsBackend: true, backtesting: true, portfolioContext: true, realProbabilityModel: true },
  generatedAt: '2026-09-19T00:00:00.000Z',
}

describe('deterministic mock AI analysis engine', () => {
  it('returns the same transparent result for identical input', () => {
    expect(createMockAiAnalysis(input, 'en')).toEqual(createMockAiAnalysis(input, 'en'))
    const result = createMockAiAnalysis(input, 'en')
    expect(result.providerMode).toBe('mock')
    expect(result.status).toBe('incomplete-evidence')
    expect(result.summary).toContain('mock analysis framework')
    expect(result.missingEvidence).toContain('Real AI model')
    expect(result.missingEvidence).toContain('Real news backend')
    expect(result.disclaimer).toContain('Not investment advice')
  })

  it('does not use network or claim a recommendation', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = createMockAiAnalysis(input, 'en')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(JSON.stringify(result)).not.toMatch(/strong buy|strong sell|guaranteed profit/i)
    fetchSpy.mockRestore()
  })

  it('uses stock-specific observation language without inventing facts', () => {
    const result = createMockAiAnalysis({ ...input, instrument: { ...input.instrument, id: 'us-nvda', symbol: 'NVDA', marketId: 'us-stock', marketLabel: 'US Stock', assetType: 'stock' } }, 'en')
    expect(result.watchReason).toContain('sector')
    expect(result.nextWatchPoints).toContain('Index mood')
  })
})
