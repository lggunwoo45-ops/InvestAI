import { fireEvent, screen, within } from '@testing-library/react'
import { Link } from 'react-router-dom'
import { expect, it } from 'vitest'
import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { Sidebar } from '@/layouts/Sidebar/Sidebar'
import { SimpleHeader } from '@/layouts/Header/SimpleHeader'
import { renderWithProviders } from './renderWithProviders'
function Shell() { const { displayMode, setDisplayMode } = useDisplayMode(); return <>{displayMode === 'simple' ? <SimpleHeader hideCopilotToggle /> : <Sidebar />}<button onClick={() => setDisplayMode(displayMode === 'simple' ? 'expert' : 'simple')}>Change layout</button><Link to="/research?asset=ETH&mode=journal">Open journal</Link><Link to="/research?asset=ETH&mode=alerts">Open futures alerts</Link></> }
it('keeps the same five destinations, names and contextual selection in both layouts', () => {
  localStorage.clear()
  renderWithProviders(<Shell />)
  const links = () => within(screen.getByRole('navigation', { name: 'Primary navigation' })).getAllByRole('link').map(link => [link.textContent || link.getAttribute('aria-label'), link.getAttribute('href')])
  const expected = [['Today', '/dashboard'], ['Discover', '/ai-analysis'], ['Holdings', '/portfolio'], ['Alerts', '/review-alerts'], ['Results', '/results']]
  expect(links()).toEqual(expected)
  fireEvent.click(screen.getByRole('link', { name: 'Open journal' }))
  expect(screen.getByRole('link', { name: 'Results' }).getAttribute('aria-current')).toBe('page')
  fireEvent.click(screen.getByRole('button', { name: 'Change layout' }))
  expect(links()).toEqual(expected)
  expect(screen.getByRole('link', { name: 'Results' }).getAttribute('aria-current')).toBe('page')
  fireEvent.click(screen.getByRole('link', { name: 'Open futures alerts' }))
  expect(screen.getByRole('link', { name: 'Alerts' }).getAttribute('aria-current')).toBe('page')
  expect(screen.getByRole('link', { name: 'Results' }).hasAttribute('aria-current')).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: 'Change layout' }))
  expect(links()).toEqual(expected)
  expect(screen.getByRole('link', { name: 'Alerts' }).getAttribute('aria-current')).toBe('page')
})
