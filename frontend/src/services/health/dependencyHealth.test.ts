import { describe, expect, it } from 'vitest'

import { buildApiUsageStatus, buildDependencyHealth } from './dependencyHealth'

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

  it('uses the safe health response to avoid contradictory DART proxy and key states', () => {
    const health = buildDependencyHealth({
      marketDataMode: 'mock',
      newsMode: 'mock',
      dartHealth: { status: 'disabled', apiKeyConfigured: false, message: 'DART API key is not configured.' },
    })
    expect(health).toContainEqual({ id: 'dart-proxy', status: 'ready' })
    expect(health).toContainEqual({ id: 'dart-api-key', status: 'disabled' })
  })
})

describe('buildApiUsageStatus', () => {
  it('reports active configured proxies without accepting or returning a key value', () => {
    const usage = buildApiUsageStatus({
      newsMode: 'local-proxy',
      newsState: 'local-proxy-ready',
      dartHealth: { status: 'ready', apiKeyConfigured: true, message: 'DART API key is configured.' },
    })
    expect(usage).toEqual([
      { id: 'news-proxy', status: 'active' },
      { id: 'dart-proxy', status: 'active' },
      { id: 'dart-api-key', status: 'active' },
      { id: 'real-ai', status: 'disabled' },
      { id: 'trading', status: 'disabled' },
    ])
    expect(JSON.stringify(usage)).not.toMatch(/DART_API_KEY|crtfc_key|test-only-key/)
  })

  it('distinguishes a reachable proxy with no key from an unavailable proxy', () => {
    const unconfigured = buildApiUsageStatus({ newsMode: 'mock', dartHealth: { status: 'disabled', apiKeyConfigured: false, message: 'DART API key is not configured.' } })
    expect(unconfigured).toContainEqual({ id: 'news-proxy', status: 'notConfigured' })
    expect(unconfigured).toContainEqual({ id: 'dart-proxy', status: 'active' })
    expect(unconfigured).toContainEqual({ id: 'dart-api-key', status: 'notConfigured' })

    const unavailable = buildApiUsageStatus({ newsMode: 'local-proxy', newsState: 'local-proxy-unavailable', dartHealth: { status: 'unavailable', apiKeyConfigured: null, message: 'Unavailable.' } })
    expect(unavailable).toContainEqual({ id: 'news-proxy', status: 'unavailable' })
    expect(unavailable).toContainEqual({ id: 'dart-proxy', status: 'unavailable' })
    expect(unavailable).toContainEqual({ id: 'dart-api-key', status: 'unknown' })
  })

  it('keeps real AI and trading disabled when dependency state is unknown', () => {
    const usage = buildApiUsageStatus({ newsMode: 'local-proxy' })
    expect(usage).toContainEqual({ id: 'real-ai', status: 'disabled' })
    expect(usage).toContainEqual({ id: 'trading', status: 'disabled' })
    expect(usage).toContainEqual({ id: 'dart-api-key', status: 'unknown' })
  })

  it('never presents an inconsistent unavailable health payload as a configured key', () => {
    const inconsistent = { status: 'unavailable', apiKeyConfigured: true, message: 'Inconsistent.' } as unknown as NonNullable<Parameters<typeof buildApiUsageStatus>[0]['dartHealth']>
    const usage = buildApiUsageStatus({ newsMode: 'mock', dartHealth: inconsistent })
    const dependencies = buildDependencyHealth({ marketDataMode: 'mock', newsMode: 'mock', dartHealth: inconsistent })

    expect(usage).toContainEqual({ id: 'dart-proxy', status: 'unknown' })
    expect(usage).toContainEqual({ id: 'dart-api-key', status: 'unknown' })
    expect(dependencies).toContainEqual({ id: 'dart-proxy', status: 'unknown' })
    expect(dependencies).toContainEqual({ id: 'dart-api-key', status: 'unknown' })
  })
})
