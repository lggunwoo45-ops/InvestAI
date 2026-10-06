import { describe, expect, it, vi } from 'vitest'

import { runtimeConfig } from '@/config/runtimeConfig'
import { checkDartConnection, DartClient, MANUAL_DART_HEALTH_ENDPOINT } from './dartClient'

describe('DartClient', () => {
  it('checks only the same-origin health endpoint for an explicit manual connection check', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'ready', apiKeyConfigured: true, message: 'Configured.' })))
    const result = await checkDartConnection(fetcher)

    expect(result).toEqual({ status: 'ready', apiKeyConfigured: true, message: 'Configured.' })
    expect(fetcher).toHaveBeenCalledWith(MANUAL_DART_HEALTH_ENDPOINT, expect.objectContaining({ method: 'GET' }))
    expect(MANUAL_DART_HEALTH_ENDPOINT).toBe('/api/dart/health')
    expect(fetcher.mock.calls.flat().join(' ')).not.toMatch(/opendart|list\.json|crtfc_key/i)
  })

  it('loads a safe configured health response without exposing any key value', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'ready', apiKeyConfigured: true, message: 'DART API key is configured.' })))
    const result = await new DartClient(fetcher).loadHealth()
    expect(result).toEqual({ status: 'ready', apiKeyConfigured: true, message: 'DART API key is configured.' })
    expect(fetcher).toHaveBeenCalledWith(runtimeConfig.dartHealthUrl, expect.objectContaining({ method: 'GET' }))
    expect(JSON.stringify(result)).not.toMatch(/test-only-key|crtfc_key|DART_API_KEY=/)
  })

  it('distinguishes an unconfigured key from an unavailable or invalid proxy', async () => {
    const unconfigured = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'disabled', apiKeyConfigured: false, message: 'DART API key is not configured.' })))
    expect(await new DartClient(unconfigured).loadHealth()).toEqual({ status: 'disabled', apiKeyConfigured: false, message: 'DART API key is not configured.' })

    const invalid = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'ready', apiKeyConfigured: false, message: 'inconsistent' })))
    expect((await new DartClient(invalid).loadHealth()).status).toBe('unavailable')
  })

  it('fails health checks safely for HTTP and network failures', async () => {
    const rejected = vi.fn().mockRejectedValue(new TypeError('network unavailable'))
    expect(await new DartClient(rejected).loadHealth()).toEqual({ status: 'unavailable', apiKeyConfigured: null, message: 'The local DART proxy is unavailable.' })

    const nonOk = vi.fn().mockResolvedValue(new Response('Unavailable', { status: 503 }))
    expect(await new DartClient(nonOk).loadHealth()).toEqual({ status: 'unavailable', apiKeyConfigured: null, message: 'The local DART proxy is unavailable.' })
  })

  it('handles disabled proxy responses without real network', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'disabled', sourceMode: 'disabled', message: 'DART API key is not configured.', disclosures: [], fetchedAt: null })))
    const result = await new DartClient(fetcher).loadDisclosures('005930', '00126380')
    expect(result.status).toBe('disabled')
    expect(fetcher).toHaveBeenCalledWith(`${runtimeConfig.dartDisclosuresUrl}?stockCode=005930&corpCode=00126380`, expect.objectContaining({ method: 'GET' }))
  })

  it('handles malformed responses and missing mappings safely', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ corrupted: true })))
    expect((await new DartClient(fetcher).loadDisclosures('005930', '00126380')).status).toBe('unavailable')
    fetcher.mockClear()
    expect((await new DartClient(fetcher).loadDisclosures('000000', null)).status).toBe('mapping_unavailable')
    expect(fetcher).not.toHaveBeenCalled()
  })
})
