import { describe, expect, it } from 'vitest'

import { createRuntimeConfig } from './runtimeConfig'

describe('runtimeConfig', () => {
  it('uses safe local defaults', () => {
    expect(createRuntimeConfig({})).toEqual({
      appEnv: 'local',
      newsProxyUrl: 'http://localhost:8787',
      dartProxyUrl: 'http://localhost:8788',
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
      isProductionLike: true,
      isLocal: false,
    })
  })

  it('never exposes a server-only DART key', () => {
    const config = createRuntimeConfig({ VITE_APP_ENV: 'local' })
    expect(JSON.stringify(config)).not.toContain('DART_API_KEY')
    expect(config).not.toHaveProperty('dartApiKey')
  })
})
