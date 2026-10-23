import { describe, expect, it } from 'vitest'
import { primaryNavigation, secondaryNavigation } from './navigation'

describe('beta primary navigation', () => {
  it('emphasizes four core destinations and preserves existing resource routes', () => {
    expect(primaryNavigation.map((item) => item.path)).toEqual(['/dashboard', '/my-analysis', '/portfolio', '/ai-analysis'])
    expect(secondaryNavigation.map((item) => item.path)).toEqual(['/research', '/market', '/news', '/demo'])
    expect(primaryNavigation.map((item) => item.path)).not.toContain('/simple')
    expect(primaryNavigation.map((item) => item.path)).not.toContain('/trading')
  })
})
