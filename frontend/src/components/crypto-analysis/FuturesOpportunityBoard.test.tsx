import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { futuresResult } from '@/test/futuresFixtures'
import { opportunityNow as now } from '@/test/opportunityFixtures'
import { FuturesOpportunityBoard } from './FuturesOpportunityBoard'

beforeEach(() => localStorage.clear())
it('shows assessed exclusions with concrete reasons instead of unconfirmed recommendations', () => {
  const rows = Array.from({length:12},(_,i)=>{
    const row = futuresResult()
    row.instrument.id = `binance-${i}`; row.instrument.symbol = `COIN${i}/USDT`
    const hour = row.decision.frames.find(f=>f.frame==='1H')!
    hour.volumeRatio = .4; hour.rsi = 20; hour.candles[25].low = 99
    return row
  })
  renderWithProviders(<FuturesOpportunityBoard results={rows} now={now} language="en" simple />)
  for (const side of ['long','short']) {
    const region = screen.getByRole('region',{name:`${side} candidates`})
    expect(within(region).getAllByRole('article')).toHaveLength(3)
    expect(within(region).getAllByText('Market evidence')).toHaveLength(3)
    expect(within(region).queryByText('Entry conditions met')).toBeNull()
  }
  const shorts = screen.getByRole('region',{name:'short candidates'})
  expect(within(shorts).getAllByText('Entry excluded')).toHaveLength(3)
  expect(within(shorts).queryByText('Stop reference')).toBeNull()
  expect(within(shorts).queryByText('Reward/risk after costs')).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'Show all decisions'}))
  expect(within(shorts).getAllByRole('article')).toHaveLength(12)
})
it('shows a short, its prices and pending checks without turning it into a spot recommendation', () => {
  const row = futuresResult()
  const view = renderWithProviders(<FuturesOpportunityBoard results={[row]} now={now} language="en" simple />)
  const shorts = screen.getByRole('region', { name:'short candidates' })
  expect(within(shorts).getByText('Entry conditions met')).toBeTruthy()
  expect(within(shorts).getByText(/SHORT · Support breakdown/)).toBeTruthy()
  expect(within(shorts).getByRole('link').getAttribute('href')).toBe('/my-analysis?instrumentId=binance-futures-solusdt')
  expect(within(shorts).getByText(/Evidence · 0 pending/).closest('details')?.open).toBe(false)
  fireEvent.click(screen.getByRole('button', {name:'Short · falling'}))
  expect(screen.queryByRole('region', {name:'long candidates'})).toBeNull()
  expect(screen.queryByText(/Record all/)).toBeNull()
  view.rerender(<FuturesOpportunityBoard results={[row]} now={now+90_001} language="en" simple />)
  expect(screen.queryByText('Entry conditions met')).toBeNull()
  expect(screen.getByText('1 scan snapshots have expired')).toBeTruthy()
  expect(screen.getByText('Earlier scan records · not current entry signals')).toBeTruthy()
  expect(screen.queryByText('1 unassessed assets')).toBeNull()
})
it('recalculates when cost changes and never shows a candidate with an invalid cost', () => {
  renderWithProviders(<FuturesOpportunityBoard results={[futuresResult()]} now={now} language="en" />)
  expect(screen.getByText(/Evidence · 0 pending/).closest('details')?.open).toBe(true)
  fireEvent.change(screen.getByRole('spinbutton'),{target:{value:''}})
  expect(screen.getByRole('alert')).toBeTruthy()
  expect(screen.queryByText('Entry conditions met')).toBeNull()
})

it('shows an actual volume threshold, complete scan counts and the same futures chart route', () => {
  const rows = Array.from({length:5}, (_,i) => {
    const row = futuresResult(); row.instrument.id = `binance-futures-${i}`
    row.decision.frames.find(f=>f.frame==='1H')!.volumeRatio = .55
    return row
  })
  renderWithProviders(<FuturesOpportunityBoard results={rows} now={now} language="ko" simple />)
  const shorts = screen.getByRole('region',{name:'숏 후보'})
  expect(within(shorts).getByText('평가 5개 · 진입 검토 0개 · 조건 대기 5개 · 진입 제외 0개')).toBeTruthy()
  expect(within(shorts).getAllByText('거래량 대기')).toHaveLength(3)
  expect(within(shorts).getAllByText(/0.55배로, 기준 1.3배/)).toHaveLength(3)
  expect(within(shorts).queryByText('추가 확인 필요')).toBeNull()
  expect(within(shorts).getAllByRole('link')[0].getAttribute('href')).toContain('binance-futures-')
})
it('does not send an already-crossed reference back to an obsolete remote entry condition', () => {
  const row = futuresResult(), hour = row.decision.frames.find(f=>f.frame==='1H')!
  row.decision.price = row.decision.price! - hour.atr! * 5
  renderWithProviders(<FuturesOpportunityBoard results={[row]} now={now} language="ko" simple />)
  const shorts = screen.getByRole('region',{name:'숏 후보'})
  expect(within(shorts).getByText('진입 제외')).toBeTruthy()
  expect(within(shorts).getByText(/단기 확인선은 이미 돌파했지만 위 제외 기준이 우선/)).toBeTruthy()
  expect(within(shorts).queryByText('조건부 진입 구간')).toBeNull()
  expect(within(shorts).queryByText('비용 반영 손익비')).toBeNull()
})
