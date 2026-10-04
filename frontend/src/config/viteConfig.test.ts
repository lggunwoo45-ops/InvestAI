import { resolve } from 'node:path'
import { loadConfigFromFile } from 'vite'
import { describe, expect, it } from 'vitest'

describe('Vite development proxy', () => {
  it('routes same-origin DART API requests to the local DART proxy', async () => {
    const loadedConfig = await loadConfigFromFile(
      { command: 'serve', mode: 'test' },
      resolve(process.cwd(), 'vite.config.ts'),
    )

    expect(loadedConfig?.config).toMatchObject({
      server: {
        proxy: {
          '/api/dart': {
            target: 'http://localhost:8788',
            changeOrigin: true,
          },
        },
      },
    })
  })
})
