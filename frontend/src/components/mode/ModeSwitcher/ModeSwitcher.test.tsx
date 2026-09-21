import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { ModeSwitcher } from './ModeSwitcher'

describe('ModeSwitcher', () => {
  it('marks Simple Mode selected and links to both views', () => {
    render(<MemoryRouter><ModeSwitcher activeMode="simple" language="en" /></MemoryRouter>)
    expect(screen.getByRole('link', { name: /Simple Mode/ }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: /Expert Mode/ }).getAttribute('href')).toBe('/ai-analysis')
  })
  it('renders Korean expert mode selected', () => {
    render(<MemoryRouter><ModeSwitcher activeMode="expert" language="ko" /></MemoryRouter>)
    expect(screen.getByRole('link', { name: /전문가모드/ }).getAttribute('aria-current')).toBe('page')
  })
})
