import { describe, expect, it } from 'vitest'

import { buildDependencyHealth } from './dependencyHealth'

describe('buildDependencyHealth', () => {
  it('maps observed dependency states without performing a health request', () => {
    expect(buildDependencyHealth({ marketDataMode: 'live', newsMode: 'local-proxy', newsState: 'local-proxy-ready', dartState: 'ready' })).toEqual([
      { id: 'market-data', status: 'ready' },
      { id: 'news-proxy', status: 'ready' },
      { id: 'dart-proxy', status: 'ready' },
      { id: 'dart-api-key', status: 'ready' },
      { id: 'real-ai', status: 'disabled' },
      { id: 'trading', status: 'disabled' },
    ])
  })

  it('keeps optional, unobserved, and intentionally disabled states distinct', () => {
    expect(buildDependencyHealth({ marketDataMode: 'mock', newsMode: 'mock' })).toEqual([
      { id: 'market-data', status: 'limited' },
      { id: 'news-proxy', status: 'disabled' },
      { id: 'dart-proxy', status: 'unknown' },
      { id: 'dart-api-key', status: 'unknown' },
      { id: 'real-ai', status: 'disabled' },
      { id: 'trading', status: 'disabled' },
    ])
  })

  it('reports observed proxy failures without treating disabled product features as errors', () => {
    const health = buildDependencyHealth({ marketDataMode: 'live', newsMode: 'local-proxy', newsState: 'local-proxy-unavailable', dartState: 'unavailable' })
    expect(health.find((item) => item.id === 'news-proxy')?.status).toBe('unavailable')
    expect(health.find((item) => item.id === 'dart-proxy')?.status).toBe('unavailable')
    expect(health.find((item) => item.id === 'real-ai')?.status).toBe('disabled')
  })
})
