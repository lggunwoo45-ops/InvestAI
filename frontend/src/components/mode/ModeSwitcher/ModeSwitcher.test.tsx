import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DisplayModeProvider } from '@/app/displayMode/DisplayModeProvider'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { ModeSwitcher } from './ModeSwitcher'

describe('ModeSwitcher', () => {
  it('renders stable English segments and changes the global selected state', () => {
    window.localStorage.clear()
    render(<LanguageProvider><DisplayModeProvider><ModeSwitcher /></DisplayModeProvider></LanguageProvider>)
    const simple = screen.getByRole('button', { name: /Simple Mode/ })
    const expert = screen.getByRole('button', { name: /Expert Mode/ })
    expect(simple.textContent).toBe('Simple')
    expect(expert.textContent).toBe('Expert')
    expect(expert.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(simple)
    expect(simple.getAttribute('aria-pressed')).toBe('true')
    expect(expert.getAttribute('aria-pressed')).toBe('false')
  })
  it('renders Korean labels without changing the segment structure', () => {
    window.localStorage.setItem('market-copilot.language', 'ko')
    render(<LanguageProvider><DisplayModeProvider><ModeSwitcher /></DisplayModeProvider></LanguageProvider>)
    expect(screen.getByRole('button', { name: /간편모드/ }).textContent).toBe('간편모드')
    expect(screen.getByRole('button', { name: /전문가모드/ }).textContent).toBe('전문가모드')
  })
})
