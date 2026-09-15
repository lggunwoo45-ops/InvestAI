import { describe, expect, it } from 'vitest'

import { reorderIds } from '@/utils/watchlists'

describe('watchlist ordering', () => {
  it('moves an instrument while preserving the other entries', () => {
    expect(reorderIds(['btc', 'eth', 'sol'], 0, 2)).toEqual(['eth', 'sol', 'btc'])
  })

  it('ignores invalid drag positions', () => {
    const ids = ['btc', 'eth']
    expect(reorderIds(ids, -1, 1)).toBe(ids)
  })
})
