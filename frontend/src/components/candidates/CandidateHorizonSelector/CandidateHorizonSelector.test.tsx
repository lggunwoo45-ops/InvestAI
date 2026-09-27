import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CandidateHorizonSelector } from './CandidateHorizonSelector'

describe('CandidateHorizonSelector', () => {
  it('shows one clear horizon selector and requests only the selected horizon', () => {
    const onChange = vi.fn()
    render(<CandidateHorizonSelector horizon="short" language="ko" onChange={onChange} />)
    expect(screen.getAllByRole('tab')).toHaveLength(3)
    expect(screen.getByRole('tab', { name: '단타' }).getAttribute('aria-selected')).toBe('true')
    fireEvent.click(screen.getByRole('tab', { name: '스윙' }))
    expect(onChange).toHaveBeenCalledWith('swing')
  })
})
