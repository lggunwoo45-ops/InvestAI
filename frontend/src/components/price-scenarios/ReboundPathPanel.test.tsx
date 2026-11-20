import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ReboundPathPanel } from './ReboundPathPanel'
import { pathSeries } from '@/test/reboundPathFixture'
import { supportHistory, supportInstrument, supportNow } from '@/test/majorSupportFixture'
vi.mock('@/hooks/useMajorSupportHistory', () => ({ useMajorSupportHistory: () => ({ data: supportHistory(), loading: false, failed: false, retry: vi.fn() }) }))
const Location = () => <output aria-label="location">{useLocation().search}</output>
describe('rebound path UI', () => {
  it('switches calculation horizons, preserves instrument and tab in the URL and persists across mode remounts', () => {
    const props = { instrument: supportInstrument, series: pathSeries(), now: supportNow, language: 'ko' as const }
    const view = render(<MemoryRouter initialEntries={['/my-analysis?instrumentId=upbit-btc&tab=summary&display=simple']}><ReboundPathPanel {...props} expert={false} /><Location /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: '핵심 지지 구간' })).toBeTruthy()
    expect(screen.getByText('현재가에서 상승 여력')).toBeTruthy()
    expect(screen.getByText('지지 중심에서 반등 폭')).toBeTruthy()
    expect(screen.getByText('선정 근거·계산 기준').closest('details')!.open).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: '중장기' }))
    expect(screen.getByText('82 KRW')).toBeTruthy()
    expect(screen.getByLabelText('location').textContent).toContain('instrumentId=upbit-btc&tab=summary&display=simple&horizon=position')
    view.rerender(<MemoryRouter><ReboundPathPanel key="expert" {...props} expert /><Location /></MemoryRouter>)
    expect(screen.getByRole('button', { name: '중장기' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('선정 근거·계산 기준').closest('details')!.open).toBe(true)
    view.rerender(<MemoryRouter><ReboundPathPanel key="expert" {...props} now={supportNow + 100_000} expert /><Location /></MemoryRouter>)
    expect(screen.queryByText('82 KRW')).toBeNull()
    expect(within(screen.getByRole('region', { name: '기간별 반등 가격 경로' })).getByRole('status').textContent).toContain('최신 실제 시세')
  })
  it('keeps futures identity and excludes leverage returns while showing all requested prices', () => {
    render(<MemoryRouter><ReboundPathPanel instrument={{ ...supportInstrument, id: 'binance-btc', symbol: 'BTCUSDT', marketId: 'binance-futures', quoteCurrency: 'USDT' }} series={pathSeries()} now={supportNow} language="ko" expert={false} /></MemoryRouter>)
    const panel = screen.getByRole('region', { name: '기간별 반등 가격 경로' })
    expect(panel.textContent).toContain('Binance Futures · USDT')
    expect(panel.textContent).not.toContain('KRW')
    expect(within(panel).getByText('예상이 깨지는 가격')).toBeTruthy()
    expect(panel.textContent).toContain('레버리지 수익률·펀딩비·청산 가격은 반영하지 않습니다')
  })
})


