import { beforeEach, describe, expect, it, vi } from 'vitest'

import { newsProviderModeStorageKey, readNewsProviderMode } from './newsProviderModeStorage'
const config = vi.hoisted(() => ({ isProductionLike: false }))
vi.mock('@/config/runtimeConfig', () => ({ runtimeConfig: config }))

describe('news provider mode storage', () => {
  beforeEach(() => { window.localStorage.clear(); config.isProductionLike = false })

  it('defaults public builds to live without overriding an explicit demo choice', () => {
    config.isProductionLike = true
    expect(readNewsProviderMode()).toBe('live')
    window.localStorage.setItem(newsProviderModeStorageKey, 'mock')
    expect(readNewsProviderMode()).toBe('mock')
    window.localStorage.setItem(newsProviderModeStorageKey, 'live')
    expect(readNewsProviderMode()).toBe('live')
  })

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
