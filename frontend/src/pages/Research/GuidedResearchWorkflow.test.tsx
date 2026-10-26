import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { Link } from 'react-router-dom'
import { renderWithProviders } from '@/test/renderWithProviders'
import { fetchResearch } from '@/services/research/researchClient'
import { readMonitor, registerMonitor, type MonitorState } from '@/services/research/monitorClient'
import type { ResearchSnapshot } from '@/services/research/researchModel'
import { ResearchPage } from './ResearchPage'

vi.mock('@/services/research/researchClient', () => ({ fetchResearch: vi.fn() }))
vi.mock('@/services/research/monitorClient', () => ({ readMonitor: vi.fn(), registerMonitor: vi.fn(), cancelMonitor: vi.fn() }))
const snapshot = (): ResearchSnapshot => {
  const now = Date.now(), end = Math.floor(now / 3_600_000) * 3_600_000
  const source = (data: unknown) => ({ status: 'available' as const, source: 'test', receivedAt: now, data })
  return { version: 1, asset: 'BTC', symbol: 'BTCUSDT', fetchedAt: now, sources: {
    mark: source({ time: now, markPrice: '100', lastFundingRate: '.0001' }),
    candles: source(Array.from({ length: 70 }, (_, i) => [end - (70 - i) * 3_600_000, 100 + i, 100.5 + i, 99.5 + i, 100 + i, 10, end - (69 - i) * 3_600_000 - 1])),
    korea: source([{ market: 'KRW-BTC', trade_price: 154500, timestamp: now }, { market: 'KRW-USDT', trade_price: 1500, timestamp: now }]),
    spot: source({ lastPrice: '100', closeTime: now }),
  } }
}
const empty = (): MonitorState => ({ version: 1, running: true, error: null, now: Date.now(), lastCycleAt: Date.now(), intervalMs: 15000, channelConfigured: false, rules: [] })
const change = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
const expert = () => fireEvent.click(screen.getByRole('button', { name: '전체 지표를 한 화면에서 보기 →' }))
const simple = () => fireEvent.click(screen.getByRole('button', { name: '쉬운 설명으로 보기' }))
async function open(mode: string) {
  renderWithProviders(<><Link to={'/research?asset=BTC&mode=' + mode}>도구 열기</Link><ResearchPage /></>)
  await screen.findByText('100', { exact: false })
  fireEvent.click(screen.getByRole('link', { name: '도구 열기' }))
}

describe('guided research tools share real calculations and drafts', () => {
  beforeEach(() => {
    localStorage.clear(); localStorage.setItem('market-copilot.language', 'ko'); vi.resetAllMocks()
    vi.mocked(fetchResearch).mockResolvedValue(snapshot()); vi.mocked(readMonitor).mockResolvedValue(empty())
  })
  it('keeps the same fee/funding calculation in both layouts and distinguishes received funding', async () => {
    await open('costs')
    change('거래 금액 (USDT)', '2000'); change('얼마나 보유하나요? (시간)', '48')
    change('조건 1 한 번 거래할 때 수수료 (%)', '0.1'); change('조건 1 정산당 펀딩률 (%)', '0.02')
    const result = within(screen.getByRole('article', { name: '조건 1 비용 결과' }))
    expect(result.getByText('6.4 USDT')).toBeTruthy()
    expert()
    expect(screen.getByText('왕복 수수료 4 + 펀딩 2.4 = 총 6.4 USDT')).toBeTruthy()
    simple()
    expect((screen.getByLabelText('거래 금액 (USDT)') as HTMLInputElement).value).toBe('2000')
    change('조건 1 정산당 펀딩률 (%)', '-0.1')
    expect(screen.getByText('-8 USDT')).toBeTruthy()
    expect(screen.getByText('보유 중 수취액이 수수료보다 큰 가정이에요.')).toBeTruthy()
    change('조건 1 정산당 펀딩률 (%)', '')
    expect(screen.getByText('금액·시간·요율을 모두 입력하면 계산해요. 펼친 보유 비용 설정도 확인해주세요.')).toBeTruthy()
    expect(screen.queryByText('-8 USDT')).toBeNull()
  })
  it('normalizes foreign prices and preserves values while rejecting impossible transfer costs', async () => {
    await open('premium')
    fireEvent.click(screen.getByRole('button', { name: '동시점 공개 시세로 채우기' }))
    expect(screen.getByRole('heading', { name: '국내 가격이 더 비싸요' })).toBeTruthy()
    expect(screen.getByText('3%')).toBeTruthy(); expect(screen.getByText('150,000원')).toBeTruthy()
    expert()
    expect((screen.getByLabelText('BTC 국내 가격 (KRW)') as HTMLInputElement).value).toBe('154500')
    expect(screen.getByText('3%')).toBeTruthy()
    change('총 거래비용·슬리피지 가정 (%)', '101')
    expect(screen.getByText('단순 환산 차액: 입력 확인 필요')).toBeTruthy()
    simple(); change('1 USDT 원화 가격 (KRW)', '')
    expect(screen.getByRole('heading', { name: '세 가격을 넣으면 비교할 수 있어요' })).toBeTruthy()
    expect(screen.queryByText('3%')).toBeNull()
  })
  it('does not fill prices when exchange observations are misaligned', async () => {
    const data = snapshot(); (data.sources.spot.data as { closeTime: number }).closeTime -= 100_000
    vi.mocked(fetchResearch).mockResolvedValue(data)
    await open('premium')
    expect((screen.getByRole('button', { name: '동시점 공개 시세로 채우기' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByLabelText('BTC 국내 가격 (KRW)') as HTMLInputElement).value).toBe('')
  })
  it('preserves nested tool drafts as well as main calculator inputs', async () => {
    await open('position')
    change('공개 지갑 주소', '0x1234')
    expert(); expect((screen.getByLabelText('공개 지갑 주소') as HTMLInputElement).value).toBe('0x1234')
    fireEvent.click(screen.getByRole('button', { name: /^시장 살펴보기/ }))
    fireEvent.click(screen.getByRole('button', { name: '시장 지표' }))
    change('ETF 확정 순유입 CSV', '2026-10-20,1000,수동 확인 자료')
    simple(); expect((screen.getByLabelText('ETF 확정 순유입 CSV') as HTMLTextAreaElement).value).toBe('2026-10-20,1000,수동 확인 자료')
  })
  it('takes a newly saved review through explicit monitor registration with its original source', async () => {
    vi.mocked(registerMonitor).mockImplementation(async config => ({ ...empty(), rules: [{ id: 'monitor-test', config, hash: 'test', createdAt: Date.now(), phase: 'waiting', last: null, entered: null, result: null, events: [], issue: null, gaps: 0 }] }))
    await open('journal')
    change('이번 검토 메모', '검토 연결 테스트')
    fireEvent.click(screen.getByRole('button', { name: '현재 검토 기준 저장' }))
    fireEvent.click(screen.getByRole('link', { name: '이 기록으로 가격 조건 정하기 →' }))
    fireEvent.click(screen.getByRole('button', { name: /포지션·신호 감시/ }))
    fireEvent.click(screen.getByRole('button', { name: '진입 조건·결과' }))
    await screen.findByText('감시 프로그램 연결됨')
    expect(registerMonitor).not.toHaveBeenCalled()
    change('목표 가격', '110'); change('손절 가격', '90')
    fireEvent.click(screen.getByRole('button', { name: '이 조건으로 서버 감시 등록' }))
    await screen.findByText('진입 구간 대기')
    expect(vi.mocked(registerMonitor).mock.calls[0][0]).toMatchObject({ instrument: { asset: 'BTC', venue: 'binance-futures', quote: 'USDT' }, source: { kind: 'review', note: '검토 연결 테스트', price: 100 }, target: 110, stop: 90, notify: false })
  })
})
