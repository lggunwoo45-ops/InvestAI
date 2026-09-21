import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { ModeSwitcher } from './ModeSwitcher'

describe('ModeSwitcher', () => {
  it('renders compact English labels and marks only Simple Mode selected', () => {
    render(<MemoryRouter><ModeSwitcher activeMode="simple" language="en" /></MemoryRouter>)
    expect(screen.getByText('Simple')).toBeTruthy()
    expect(screen.getByText('Expert')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Simple Mode/ }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: /Expert Mode/ }).getAttribute('aria-current')).toBeNull()
    expect(screen.getByRole('link', { name: /Expert Mode/ }).getAttribute('href')).toBe('/ai-analysis')
  })
  it('keeps both Korean segments in place and marks only Expert Mode selected', () => {
    render(<MemoryRouter><ModeSwitcher activeMode="expert" language="ko" /></MemoryRouter>)
    expect(screen.getByRole('link', { name: /간편모드/ }).getAttribute('aria-current')).toBeNull()
    expect(screen.getByRole('link', { name: /전문가모드/ }).getAttribute('aria-current')).toBe('page')
  })
})
