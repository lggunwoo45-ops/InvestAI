import { describe, expect, it } from 'vitest'

import { createRuntimeConfig } from './runtimeConfig'

describe('runtimeConfig', () => {
  it('uses safe local defaults', () => {
    expect(createRuntimeConfig({})).toEqual({
      appEnv: 'local',
      newsProxyUrl: 'http://localhost:8787',
      dartProxyUrl: '',
      dartHealthUrl: '/api/dart/health',
      dartDisclosuresUrl: '/api/dart/disclosures',
      isProductionLike: false,
      isLocal: true,
    })
  })

  it('respects public Vite settings and normalizes trailing slashes', () => {
    expect(createRuntimeConfig({
      VITE_APP_ENV: 'preview',
      VITE_NEWS_PROXY_URL: 'https://news.example.test/',
      VITE_DART_PROXY_URL: 'https://dart.example.test/',
    })).toEqual({
      appEnv: 'preview',
      newsProxyUrl: 'https://news.example.test',
      dartProxyUrl: 'https://dart.example.test',
      dartHealthUrl: 'https://dart.example.test/api/dart/health',
      dartDisclosuresUrl: 'https://dart.example.test/api/dart/disclosures',
      isProductionLike: true,
      isLocal: false,
    })
  })

  it('uses an external DART base only when it is explicitly configured', () => {
    expect(createRuntimeConfig({ VITE_DART_PROXY_URL: '  ' }).dartHealthUrl).toBe('/api/dart/health')
    expect(createRuntimeConfig({ VITE_DART_PROXY_URL: 'https://dart.example.test/' }).dartHealthUrl).toBe('https://dart.example.test/api/dart/health')
  })

  it('never exposes a server-only DART key', () => {
    const config = createRuntimeConfig({ VITE_APP_ENV: 'local' })
    expect(JSON.stringify(config)).not.toContain('DART_API_KEY')
    expect(config).not.toHaveProperty('dartApiKey')
  })
})
