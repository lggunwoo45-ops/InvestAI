import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { EtfLedger } from './EtfLedger'
import { ETF_KEY, readEtfLedger } from '@/services/research/etfLedger'
vi.mock('@/services/cloud/cloudClient', () => ({ cloudSignedIn: () => false, researchStorage: { getItem: (key: string) => localStorage.getItem(key), setItem: (key: string, value: string) => localStorage.setItem(key, value) } }))
beforeEach(() => localStorage.clear())
const save = (text: string) => { fireEvent.change(screen.getByLabelText('ETF 확정 순유입 CSV'), { target: { value: text } }); fireEvent.click(screen.getByRole('button', { name: '기록 합산·저장' })) }
it('retains records on remount and separates assets with visible revision history', () => {
  let view = render(<EtfLedger />)
  save('2026-01-01,1000,보고서 A'); expect(screen.getByText(/입력한 1일 합계 1,000/)).toBeTruthy()
  view.unmount(); view = render(<EtfLedger />)
  expect(screen.getByText(/입력한 1일 합계 1,000/)).toBeTruthy()
  save('2026-01-01,800,정정 보고서'); expect(screen.getByText('수정 전 기록 1개')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('ETF 구분'), { target: { value: 'ETH' } })
  expect(screen.getByText('이 종목에 저장한 확정 자료가 없습니다.')).toBeTruthy()
  save('2026-01-01,-200,ETH 보고서')
  expect(readEtfLedger().rows.map(r => [r.asset, r.flow, r.revision])).toEqual([['BTC', 800, 2], ['ETH', -200, 1]])
})
it('does not overwrite corrupt records or report success when storage fails', () => {
  localStorage.setItem(ETF_KEY, '{bad')
  const view = render(<EtfLedger />)
  expect((screen.getByRole('button', { name: '기록 합산·저장' }) as HTMLButtonElement).disabled).toBe(true)
  expect(localStorage.getItem(ETF_KEY)).toBe('{bad'); view.unmount(); localStorage.clear()
  render(<EtfLedger />)
  const mock = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('저장 공간 부족') })
  save('2026-01-01,1000,보고서')
  expect(screen.getByRole('alert').textContent).toContain('저장 공간 부족'); expect(screen.queryByRole('status')).toBeNull()
  mock.mockRestore()
})
