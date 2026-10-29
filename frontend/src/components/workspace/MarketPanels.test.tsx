import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { DisplayModeContext } from '@/app/displayMode/displayModeContext'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { MarketPanels } from './MarketPanels'
import { marketPanelGeometry } from './panelGeometry'
import { ResizeHandle } from './ResizeHandle'

let notify: ResizeObserverCallback
beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('ResizeObserver', class { constructor(callback: ResizeObserverCallback) { notify = callback } observe() {} disconnect() {} })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const resize = (width: number) => act(() => notify([{ contentRect: { width, height: 700 } } as ResizeObserverEntry], {} as ResizeObserver))
const view = (mode: 'simple' | 'expert' = 'expert') => <LanguageProvider><DisplayModeContext value={{ displayMode:mode, setDisplayMode:vi.fn() }}><MarketPanels navigator={<input aria-label="Search assets" defaultValue="BTC" />} detail={<input aria-label="Chart note" defaultValue="Keep this" />} activity={<p>Trade feed</p>} /></DisplayModeContext></LanguageProvider>

it('keeps the chart at least 500px wide while adapting to the actual available width', () => {
  for (const width of [820, 900, 1100, 1200, 1366, 1920, 2560]) {
    const g = marketPanelGeometry(width, 520, 480, false, true, true)
    const remaining = width - g.listWidth - 10 - (g.layout === 'wide' ? g.tradeWidth + 10 : 0)
    expect(remaining).toBeGreaterThanOrEqual(500)
  }
  expect(marketPanelGeometry(780, 520, 480, false, true, true).layout).toBe('narrow')
})
it('temporarily clamps saved widths on smaller monitors and restores them without losing input state', () => {
  localStorage.setItem('investai.market.panels.expert.v1.list', '490')
  const app = render(view()); resize(1920)
  expect(screen.getByRole('separator', { name:'Resize asset list' }).getAttribute('aria-valuenow')).toBe('490')
  fireEvent.change(screen.getByLabelText('Chart note'), { target:{ value:'My draft' } })
  resize(820)
  expect(screen.getByRole('separator', { name:'Resize asset list' }).getAttribute('aria-valuenow')).toBe('310')
  resize(700)
  expect(app.container.querySelector('[data-market-panel-layout]')?.getAttribute('data-market-panel-layout')).toBe('narrow')
  fireEvent.click(screen.getByText('Open asset list'))
  expect((screen.getByLabelText('Search assets') as HTMLInputElement).value).toBe('BTC')
  resize(1920)
  expect(screen.getByRole('separator', { name:'Resize asset list' }).getAttribute('aria-valuenow')).toBe('490')
  expect((screen.getByLabelText('Chart note') as HTMLInputElement).value).toBe('My draft')
  expect(localStorage.getItem('investai.market.panels.expert.v1.list')).toBe('490')
})
it('focuses the chart without unmounting work, restores with Escape, and resets stored sizes', () => {
  render(view()); resize(1920)
  fireEvent.keyDown(screen.getByRole('separator', { name:'Resize asset list' }), {key:'ArrowRight',shiftKey:true})
  expect(localStorage.getItem('investai.market.panels.expert.v1.list')).toBe('350')
  const input = screen.getByLabelText('Chart note')
  fireEvent.click(screen.getByText('Focus chart'))
  expect(screen.getByLabelText('Chart note')).toBe(input)
  expect(screen.queryByText('Trade feed')).toBeTruthy()
  expect(screen.getByText('Trade feed').parentElement?.hidden).toBe(true)
  fireEvent.keyDown(document, {key:'Escape'})
  expect(screen.getByText('Trade feed').parentElement?.hidden).toBe(false)
  fireEvent.click(screen.getByText('Reset layout'))
  expect(localStorage.getItem('investai.market.panels.expert.v1.list')).toBe('300')
})
it('stores sizes independently for simple and expert modes, and reveals optional trading panes', () => {
  localStorage.setItem('investai.market.panels.expert.v1.list', '400')
  const app = render(view()); resize(1920)
  app.rerender(view('simple'))
  fireEvent.keyDown(screen.getByRole('separator', { name:'Resize asset list' }), {key:'ArrowRight'})
  expect(localStorage.getItem('investai.market.panels.simple.v1.list')).toBe('310')
  expect(localStorage.getItem('investai.market.panels.expert.v1.list')).toBe('400')
  app.unmount(); render(view('simple')); resize(1920)
  expect(screen.getByText('Trade feed').parentElement?.hidden).toBe(true)
  fireEvent.click(screen.getByText('Show activity'))
  expect(screen.getByText('Trade feed').parentElement?.hidden).toBe(false)
})
it('clamps pointer drags, supports keyboard bounds, and stops applying cancelled drags', () => {
  function Harness() { const [width,setWidth] = useState(300); return <ResizeHandle label="Size" value={width} min={240} max={500} onChange={setWidth} /> }
  render(<Harness />)
  const handle = screen.getByRole('separator')
  const pointer = (type:string,x:number) => fireEvent(handle,new MouseEvent(type,{bubbles:true,button:0,clientX:x}))
  pointer('pointermove',100)
  pointer('pointerdown',100); pointer('pointermove',500)
  expect(handle.getAttribute('aria-valuenow')).toBe('500')
  pointer('pointercancel',500); pointer('pointermove',0)
  expect(handle.getAttribute('aria-valuenow')).toBe('500')
  fireEvent.keyDown(handle,{key:'Home'})
  expect(handle.getAttribute('aria-valuenow')).toBe('240')
  fireEvent.keyDown(handle,{key:'ArrowRight',shiftKey:true})
  expect(handle.getAttribute('aria-valuenow')).toBe('290')
})
