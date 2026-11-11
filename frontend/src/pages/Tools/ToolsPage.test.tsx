import { fireEvent, screen } from '@testing-library/react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { expect, it } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { ToolsPage } from './ToolsPage'
function Controls() { const { setDisplayMode } = useDisplayMode(), location = useLocation(); return <><button onClick={() => setDisplayMode('expert')}>Change view</button><output data-testid="location">{location.pathname + location.search}</output></> }
it('searches tool purposes, keeps filters on mode changes and opens the exact scoped destination', () => {
  localStorage.clear()
  renderWithProviders(<><ToolsPage /><Controls /></>)
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search tools' }), { target: { value: 'ETF' } })
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
it('restores a linked search and permits recovery from a stale category', () => {
  localStorage.clear()
  renderWithProviders(<><Routes><Route path="/" element={<Link to="/tools?group=missing&q=펀딩">Open saved search</Link>} /><Route path="/tools" element={<ToolsPage />} /></Routes><Controls /></>)
  fireEvent.click(screen.getByRole('link', { name: 'Open saved search' }))
  expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('link', { name: 'Fees and funding' }).getAttribute('href')).toBe('/research?mode=costs')
  expect(screen.queryByRole('link', { name: 'My review journal' })).toBeNull()
})
