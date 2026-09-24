import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { buildMyInstrumentAnalysis } from '@/services/myAnalysis/myAnalysisEngine'
import type { MarketInstrument } from '@/types/market'
import { ActionBrief } from './ActionBrief'

const crypto: MarketInstrument = { id: 'upbit-btc', marketId: 'upbit', marketType: 'upbit-krw', providerType: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 2, volume24h: 10_000 }
const stock: MarketInstrument = { id: 'krx-005930', marketId: 'korea-stock', marketType: 'kospi', providerType: 'mock-krx', symbol: '005930', name: 'Samsung Electronics', quoteCurrency: 'KRW', lastPrice: 70_000, change24hPercent: 1, volume24h: 1_000_000 }
const base = { intent: 'watching' as const, userNote: '', averagePrice: null, newsResult: null }

describe('ActionBrief', () => {
  it('renders current state, data confidence, and every safe status guide entry', () => {
    const analysis = buildMyInstrumentAnalysis({ ...base, instrument: crypto, catalogSource: 'live', language: 'en' })
    render(<ActionBrief analysis={analysis} language="en" mode="simple" />)
    const brief = screen.getByRole('region', { name: 'Action brief' })
    expect(within(brief).getByRole('heading', { level: 2, name: 'Waiting / checking conditions' })).toBeTruthy()
    expect(within(brief).getByText('Data confidence')).toBeTruthy()
    expect(within(brief).getByText('Live data')).toBeTruthy()
    expect(brief.textContent).toContain('Status is based on currently loaded public market data.')
    const guide = within(brief).getByText('How to read action status').closest('details')
    expect(guide).not.toBeNull()
    for (const status of ['Decision pending', 'Waiting / checking conditions', 'Watch zone', 'Conditional approach possible', 'Movement expansion caution', 'Sharp-drop rebound caution']) {
      expect(within(guide as HTMLElement).getByText(status)).toBeTruthy()
    }
    expect(guide?.textContent).not.toMatch(/buy signal|sell signal|entry price|stop loss|target price|take profit/i)
  })

  it('makes mock data useful as a workflow preview without action prices or percentage zones', () => {
    const analysis = buildMyInstrumentAnalysis({ ...base, instrument: stock, catalogSource: 'mock', language: 'en' })
    render(<ActionBrief analysis={analysis} language="en" mode="simple" />)
    const brief = screen.getByRole('region', { name: 'Action brief' })
    expect(within(brief).getByRole('heading', { level: 2, name: 'Decision pending' })).toBeTruthy()
    expect(within(brief).getByText('Mock/demo data')).toBeTruthy()
    expect(brief.textContent).toContain('This is a workflow preview. The result shows how analysis will be organized when reliable data is connected.')
    expect(brief.textContent).not.toMatch(/review zones|1\.5%|3\.0%|5\.0%|7\.0%|entry price|stop loss|target price|KRW\s?\d/i)
  })

  it('keeps the brief visible in Expert Mode and links it to rule basis', () => {
    const analysis = buildMyInstrumentAnalysis({ ...base, instrument: crypto, catalogSource: 'live', language: 'en' })
    render(<ActionBrief analysis={analysis} language="en" mode="expert" />)
    const brief = screen.getByRole('region', { name: 'Action brief' })
    expect(brief).toBeTruthy()
    expect(within(brief).getByText('See rule basis below.')).toBeTruthy()
  })

  it('renders Korean labels and explanations without unsafe wording', () => {
    const analysis = buildMyInstrumentAnalysis({ ...base, instrument: stock, catalogSource: 'mock', language: 'ko' })
    render(<ActionBrief analysis={analysis} language="ko" mode="simple" />)
    const brief = screen.getByRole('region', { name: '액션 브리핑' })
    expect(within(brief).getByRole('heading', { level: 2, name: '판단 보류' })).toBeTruthy()
    expect(within(brief).getByText('데이터 신뢰 상태')).toBeTruthy()
    expect(within(brief).getByText('모의/데모 데이터')).toBeTruthy()
    expect(brief.textContent).toContain('흐름 미리보기입니다. 신뢰 가능한 데이터가 연결되면 분석이 어떻게 정리되는지 보여줍니다.')
    expect(brief.textContent).not.toMatch(/매수가|손절가|익절가|목표가|매수 추천/)
  })
})
