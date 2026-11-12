import { fireEvent, screen } from '@testing-library/react'
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { expect, it } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { ToolsPage } from './ToolsPage'
function Controls() { const { setDisplayMode } = useDisplayMode(), location = useLocation(), navigate = useNavigate(); return <><button onClick={() => setDisplayMode('expert')}>Change view</button><button onClick={() => navigate('/?q=ETF&source=bookmark')}>Saved ETF search</button><button onClick={() => navigate(-1)}>Back</button><button onClick={() => navigate(1)}>Forward</button><output data-testid="location">{location.pathname + location.search}</output></> }
it('searches tool purposes, keeps filters on mode changes and opens the exact scoped destination', () => {
  localStorage.clear()
  renderWithProviders(<><ToolsPage /><Controls /></>)
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search tools' }), { target: { value: 'ETF' } })
  fireEvent.blur(screen.getByRole('searchbox', { name: 'Search tools' }))
  expect(screen.getByRole('link', { name: 'Market indicators' }).getAttribute('href')).toBe('/research?mode=indicators')
  expect(screen.queryByRole('link', { name: 'Position risk' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Change view' }))
  expect(screen.getByTestId('location').textContent).toBe('/?q=ETF')
  expect(screen.getByText('Live and daily series differ. Missing sources are not estimated.').closest('details')?.open).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Plan and test' }))
  expect(screen.getByRole('heading', { name: 'No matching tools' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Show all tools' }))
  expect(screen.getByRole('link', { name: 'Position risk' }).getAttribute('href')).toBe('/research?mode=position')
  expect(screen.getByTestId('location').textContent).toBe('/')
})

it('keeps Korean composition local and synchronous, then applies only the finished query', () => {
  localStorage.clear()
  renderWithProviders(<><ToolsPage /><Controls /></>)
  const input = screen.getByRole('searchbox', { name: 'Search tools' }) as HTMLInputElement
  fireEvent.compositionStart(input)
  for (const value of ['ㅅ', '소', '손', '손ㅈ', '손저', '손절']) {
    fireEvent.change(input, { target: { value } })
    expect(input.value).toBe(value)
    expect(screen.getByTestId('location').textContent).toBe('/')
  }
  fireEvent.keyDown(input, { key: 'Enter', keyCode: 229, isComposing: true })
  fireEvent.submit(screen.getByRole('search'))
  expect(screen.getByTestId('location').textContent).toBe('/')
  fireEvent.compositionEnd(input, { data: '절' })
  fireEvent.change(input, { target: { value: '손절' } })
  expect(input.value).toBe('손절')
  expect(screen.getByRole('link', { name: 'Purchase sizing' }).getAttribute('href')).toBe('/trading')
  fireEvent.click(screen.getByRole('button', { name: 'Change view' }))
  expect(input.value).toBe('손절')
  fireEvent.submit(screen.getByRole('search'))
  expect(new URLSearchParams(screen.getByTestId('location').textContent!.split('?')[1]).get('q')).toBe('손절')
  fireEvent.change(input, { target: { value: '손' } })
  fireEvent.change(input, { target: { value: '' } })
  fireEvent.blur(input)
  expect(input.value).toBe('')
  expect(screen.getByTestId('location').textContent).toBe('/')
})

it('restores navigation searches and recovers a category mismatch without losing the query or unrelated parameters', () => {
  localStorage.clear()
  renderWithProviders(<><ToolsPage /><Controls /></>)
  const input = screen.getByRole('searchbox', { name: 'Search tools' }) as HTMLInputElement
  fireEvent.click(screen.getByRole('button', { name: 'Saved ETF search' }))
  expect(input.value).toBe('ETF')
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(input.value).toBe('')
  fireEvent.click(screen.getByRole('button', { name: 'Forward' }))
  expect(input.value).toBe('ETF')
  fireEvent.click(screen.getByRole('button', { name: 'Plan and test' }))
  expect(screen.getByRole('heading', { name: 'No matching tools' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Search all categories' }))
  expect(input.value).toBe('ETF')
  expect(screen.getByRole('link', { name: 'Market indicators' })).toBeTruthy()
  expect(screen.getByTestId('location').textContent).toBe('/?q=ETF&source=bookmark')
  fireEvent.click(screen.getByRole('button', { name: 'stop' }))
  expect(input.value).toBe('stop')
  expect(screen.getByRole('link', { name: 'Purchase sizing' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
  expect(screen.getByTestId('location').textContent).toBe('/?source=bookmark')
})
it('restores a linked search and permits recovery from a stale category', () => {
  localStorage.clear()
  renderWithProviders(<><Routes><Route path="/" element={<Link to="/tools?group=missing&q=펀딩">Open saved search</Link>} /><Route path="/tools" element={<ToolsPage />} /></Routes><Controls /></>)
  fireEvent.click(screen.getByRole('link', { name: 'Open saved search' }))
  expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('link', { name: 'Fees and funding' }).getAttribute('href')).toBe('/research?mode=costs')
  expect(screen.queryByRole('link', { name: 'My review journal' })).toBeNull()
})
