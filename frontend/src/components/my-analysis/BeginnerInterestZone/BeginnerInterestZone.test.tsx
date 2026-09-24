import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { buildMyInstrumentAnalysis } from '@/services/myAnalysis/myAnalysisEngine'
import type { MarketInstrument } from '@/types/market'
import type { MyAnalysisResult } from '@/types/myAnalysis'
import { BeginnerInterestZone } from './BeginnerInterestZone'
import { deriveBeginnerInterestStage } from './beginnerInterestZoneModel'

const instrument: MarketInstrument = { id: 'btc', marketId: 'upbit', marketType: 'upbit-krw', providerType: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 1, volume24h: 1000 }
const base = buildMyInstrumentAnalysis({ instrument, intent: 'watching', userNote: '', averagePrice: null, catalogSource: 'live', newsResult: null, language: 'en' })
const withPlan = (status: MyAnalysisResult['actionReadiness']['status'], strength: MyAnalysisResult['actionReadiness']['strength'] = 'medium', dataQuality: MyAnalysisResult['dataQuality'] = 'live'): MyAnalysisResult => ({ ...base, dataQuality, actionReadiness: { ...base.actionReadiness, status, strength, dataQuality } })

describe('BeginnerInterestZone', () => {
  it('maps safe review states without transaction labels', () => {
    expect(deriveBeginnerInterestStage(withPlan('watchZone'))).toBe('first')
    expect(deriveBeginnerInterestStage(withPlan('conditionalApproach'))).toBe('second')
    expect(deriveBeginnerInterestStage(withPlan('conditionalApproach', 'high'))).toBe('third')
    expect(deriveBeginnerInterestStage(withPlan('conditionalApproach', 'high', 'mock'))).toBe('waiting')
    render(<BeginnerInterestZone analysis={withPlan('watchZone')} language="en" />)
    expect(screen.getByRole('region', { name: 'Interest stage' }).textContent).toContain('1st interest zone')
    expect(document.body.textContent).not.toMatch(/buy signal|sell signal|entry price|stop loss|target price|take profit/i)
  })

  it('renders Korean stage labels', () => {
    render(<BeginnerInterestZone analysis={withPlan('conditionalApproach')} language="ko" />)
    expect(screen.getByRole('region', { name: '관심 단계' }).textContent).toContain('2차 관심구간')
  })
})
