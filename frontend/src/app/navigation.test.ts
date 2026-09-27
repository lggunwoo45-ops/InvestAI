import { describe, expect, it } from 'vitest'
import { primaryNavigation } from './navigation'

describe('beta primary navigation', () => {
  it('emphasizes the six user-facing beta destinations', () => {
    expect(primaryNavigation.map((item) => item.label)).toEqual(['Dashboard', 'Market', 'AI Analysis', 'My Analysis', 'News', 'Demo'])
    expect(primaryNavigation.map((item) => item.path)).not.toContain('/simple')
    expect(primaryNavigation.map((item) => item.path)).not.toContain('/trading')
  })
})
