import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DISPLAY_MODE_STORAGE_KEY } from './displayModeStorage'
import { DisplayModeProvider } from './DisplayModeProvider'
import { useDisplayMode } from './useDisplayMode'

function Consumer() {
  const { displayMode, setDisplayMode } = useDisplayMode()
  return <><output>{displayMode}</output><button type="button" onClick={() => setDisplayMode('expert')}>Expert</button></>
}

describe('DisplayModeProvider', () => {
  it('defaults to simple and persists a valid change', () => {
    window.localStorage.clear()
    render(<DisplayModeProvider><Consumer /></DisplayModeProvider>)
    expect(screen.getByText('simple')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Expert' }))
    expect(screen.getByText('expert')).toBeTruthy()
    expect(window.localStorage.getItem(DISPLAY_MODE_STORAGE_KEY)).toBe('expert')
  })

  it('restores a valid persisted mode', () => {
    window.localStorage.setItem(DISPLAY_MODE_STORAGE_KEY, 'expert')
    render(<DisplayModeProvider><Consumer /></DisplayModeProvider>)
    expect(screen.getByText('expert')).toBeTruthy()
  })

  it('falls back to simple for an invalid persisted value', () => {
    window.localStorage.setItem(DISPLAY_MODE_STORAGE_KEY, 'compact')
    render(<DisplayModeProvider><Consumer /></DisplayModeProvider>)
    expect(screen.getByText('simple')).toBeTruthy()
  })
})
