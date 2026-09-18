import { describe, expect, it } from 'vitest'

import { safeNewsUrl } from './safeNewsUrl'

describe('safeNewsUrl', () => {
  it('accepts only absolute HTTPS links without credentials', () => {
    expect(safeNewsUrl('https://example.com/news?id=1')).toBe('https://example.com/news?id=1')
    for (const url of ['javascript:alert(1)', 'data:text/html,hello', 'file:///secret', 'http://example.com', '//example.com', '/news', 'https://user:pass@example.com']) {
      expect(safeNewsUrl(url)).toBeNull()
    }
  })
})
