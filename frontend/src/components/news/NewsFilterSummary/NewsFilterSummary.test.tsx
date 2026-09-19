import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { NewsFilterSummary } from './NewsFilterSummary'

describe('NewsFilterSummary', () => {
  it('hides when no filters are active', () => {
    const { container } = render(<NewsFilterSummary filters={[]} title="Active filters" clearAllLabel="Clear all" removeLabel="Remove filter" onClearAll={() => undefined} />)
    expect(container.firstChild).toBeNull()
  })

  it('announces filters and supports individual and complete reset actions', () => {
    const remove = vi.fn()
    const clear = vi.fn()
    render(<NewsFilterSummary filters={[{ id: 'market', label: 'Market', value: 'Crypto', onRemove: remove }]} title="Active filters" clearAllLabel="Clear all" removeLabel="Remove filter" onClearAll={clear} />)

    expect(screen.getByRole('region', { name: 'Active filters' }).textContent).toContain('Crypto')
    fireEvent.click(screen.getByRole('button', { name: 'Remove filter: Market Crypto' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(remove).toHaveBeenCalledOnce()
    expect(clear).toHaveBeenCalledOnce()
  })
})
