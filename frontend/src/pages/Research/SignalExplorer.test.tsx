import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { fetchResearchHistory } from '@/services/research/researchClient'
import { readMonitor, registerSignalWatch } from '@/services/research/monitorClient'
import { defaultExplorerConfig, exploreHistory, timeframes } from '@/services/research/signalExplorer'
import { readExplorerPresets } from '@/services/research/explorerPresets'
import { SignalExplorer } from './SignalExplorer'
vi.mock('@/services/research/researchClient', () => ({ fetchResearchHistory: vi.fn() }))
vi.mock('@/services/research/monitorClient', () => ({ readMonitor: vi.fn(), registerSignalWatch: vi.fn(), stopSignalWatch: vi.fn() }))
const fixture = () => {
  const end = Math.floor(Date.now() / 3600000) * 3600000
  return { version: 1 as const, asset: 'BTC', timeframe: '1h' as const, requested: 1000, fetchedAt: Date.now(), asOf: Date.now(), source: 'test', candles: Array.from({ length: 240 }, (_, i) => { const close = 100 + 8 * Math.sin(i / 7); return { timestamp: end - (240 - i) * 3600000, open: close - .2, high: close + .5, low: close - .5, close, volume: 10 } }) }
}
const state = () => ({ version: 1 as const, running: true, error: null, now: Date.now(), lastCycleAt: Date.now(), intervalMs: 15000, channelConfigured: false, rules: [], signals: [] })
beforeEach(() => { localStorage.clear(); localStorage.setItem('market-copilot.language', 'ko'); vi.resetAllMocks(); vi.mocked(fetchResearchHistory).mockResolvedValue(fixture()); vi.mocked(readMonitor).mockResolvedValue(state()); vi.mocked(registerSignalWatch).mockResolvedValue(state()) })
it('uses real historical samples and retains parameters across distinct simple/expert layouts', async () => {
  const data = fixture(); vi.mocked(fetchResearchHistory).mockResolvedValue(data)
  renderWithProviders(<SignalExplorer asset="BTC" />)
  const expected = exploreHistory(data.candles, defaultExplorerConfig)!
  await screen.findByText(`${expected.samples}개 비중복 사례`)
  expect(screen.getByRole('heading', { name: '내 생각을, 과거 흐름과 비교해보세요.' })).toBeTruthy()
  fireEvent.change(screen.getByLabelText('위·아래 가격 폭 (%)'), { target: { value: '3' } })
  fireEvent.click(screen.getByRole('button', { name: '전문가' }))
  expect(screen.getByRole('heading', { name: '가격의 움직임을 조건으로 읽다.' })).toBeTruthy()
  expect((screen.getByLabelText('위·아래 가격 폭 (%)') as HTMLInputElement).value).toBe('3')
  expect(screen.getAllByRole('checkbox').length).toBe(31)
  fireEvent.click(screen.getByRole('button', { name: '심플' }))
  fireEvent.change(screen.getByLabelText('위·아래 가격 폭 (%)'), { target: { value: '' } })
  expect(screen.getByText('신호와 유효한 숫자를 입력하면 비교 결과를 보여드려요.')).toBeTruthy()
  expect((screen.getByRole('button', { name: /이 조건 저장하기/ }) as HTMLButtonElement).disabled).toBe(true)
})
it('saves, reloads, shares and removes selected conditions without including private notes', async () => {
  renderWithProviders(<SignalExplorer asset="BTC" />)
  await screen.findByRole('img', { name: '최근 가격 흐름과 조건 충족 위치' })
  fireEvent.change(screen.getByLabelText('조건 이름'), { target: { value: '나의 비교 조건' } })
  fireEvent.click(screen.getByRole('button', { name: /이 조건 저장하기/ }))
  expect(readExplorerPresets()).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: '조건 링크 만들기' }))
  const link = new URL((screen.getByLabelText('공유할 조건 링크') as HTMLInputElement).value)
  expect(JSON.parse(link.searchParams.get('config')!)).toEqual(defaultExplorerConfig)
  expect(link.href).not.toContain('나의')
  fireEvent.change(screen.getByLabelText('위·아래 가격 폭 (%)'), { target: { value: '7' } })
  fireEvent.click(screen.getByRole('button', { name: '저장한 조건 1' })); fireEvent.click(screen.getByRole('button', { name: '불러오기' }))
  expect((screen.getByLabelText('위·아래 가격 폭 (%)') as HTMLInputElement).value).toBe('2')
  fireEvent.click(screen.getByRole('button', { name: '저장한 조건 1' })); fireEvent.click(screen.getByRole('button', { name: '나의 비교 조건 삭제' }))
  expect(readExplorerPresets()).toHaveLength(0)
})
it('requests the selected timeframe and ignores an older request after switching', async () => {
  let resolveOld!: (value: ReturnType<typeof fixture>) => void
  vi.mocked(fetchResearchHistory).mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
  renderWithProviders(<SignalExplorer asset="BTC" />)
  fireEvent.click(screen.getByRole('button', { name: '10m' }))
  await waitFor(() => expect(fetchResearchHistory).toHaveBeenLastCalledWith('BTC', '10m', 1000, expect.any(AbortSignal)))
  resolveOld({ ...fixture(), candles: [] })
  await screen.findByRole('img', { name: '최근 가격 흐름과 조건 충족 위치' })
  expect(timeframes['10m']).toBe(600000)
})
it('registers the selected signal config only on an explicit click with notification opt-in', async () => {
  renderWithProviders(<SignalExplorer asset="BTC" />)
  await waitFor(() => expect((screen.getByRole('button', { name: '선택한 신호 감시 시작' }) as HTMLButtonElement).disabled).toBe(false))
  expect(registerSignalWatch).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '선택한 신호 감시 시작' }))
  await waitFor(() => expect(registerSignalWatch).toHaveBeenCalledTimes(1))
  expect(vi.mocked(registerSignalWatch).mock.calls[0]![0]).toMatchObject({ asset: 'BTC', config: defaultExplorerConfig, notify: false, purpose: 'opportunity' })
  expect(await screen.findByText(/신호 감시를 등록했어요/)).toBeTruthy()
})
it('shows source failures without fabricated chart or result values', async () => {
  vi.mocked(fetchResearchHistory).mockRejectedValue(new Error('과거 시세 연결 실패'))
  renderWithProviders(<SignalExplorer asset="BTC" />)
  await screen.findByText('과거 시세 연결 실패')
  expect(screen.queryByRole('img')).toBeNull()
  expect(screen.getByText('시세를 불러온 뒤 실제 관측 결과를 계산합니다.')).toBeTruthy()
})
