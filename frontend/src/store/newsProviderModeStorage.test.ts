import { beforeEach, describe, expect, it } from 'vitest'

import { newsProviderModeStorageKey, readNewsProviderMode } from './newsProviderModeStorage'

describe('news provider mode storage', () => {
  beforeEach(() => window.localStorage.clear())

  it('defaults to Mock and ignores unknown stored values', () => {
    expect(readNewsProviderMode()).toBe('mock')
    window.localStorage.setItem(newsProviderModeStorageKey, 'live-secret-mode')
    expect(readNewsProviderMode()).toBe('mock')
  })

  it('restores an explicit RSS opt-in', () => {
    window.localStorage.setItem(newsProviderModeStorageKey, 'rss-ready')
    expect(readNewsProviderMode()).toBe('rss-ready')
  })

  it('restores an explicit local proxy opt-in', () => {
    window.localStorage.setItem(newsProviderModeStorageKey, 'local-proxy')
    expect(readNewsProviderMode()).toBe('local-proxy')
  })
})
