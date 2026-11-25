import { expect, it } from 'vitest'
import { serviceOriginForHost } from './support'

it('keeps Cloudflare guides on the public service and preserves the legacy GitHub origin', () => {
  expect(serviceOriginForHost('marketcopilotapp.pages.dev')).toBe('https://marketcopilotapp.pages.dev')
  expect(serviceOriginForHost('1234.marketcopilotapp.pages.dev')).toBe('https://marketcopilotapp.pages.dev')
  for (const host of ['lggunwoo45-ops.github.io','127.0.0.1','marketcopilotapp.pages.dev.example.com']) {
    expect(serviceOriginForHost(host)).toBe('https://lggunwoo45-ops.github.io')
  }
})
