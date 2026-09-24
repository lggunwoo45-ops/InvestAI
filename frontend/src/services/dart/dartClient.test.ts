import { describe, expect, it, vi } from 'vitest'

import { DartClient } from './dartClient'

describe('DartClient', () => {
  it('handles disabled proxy responses without real network', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'disabled', sourceMode: 'disabled', message: 'DART API key is not configured.', disclosures: [], fetchedAt: null })))
    const result = await new DartClient(fetcher).loadDisclosures('005930', '00126380')
    expect(result.status).toBe('disabled')
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('handles malformed responses and missing mappings safely', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ corrupted: true })))
    expect((await new DartClient(fetcher).loadDisclosures('005930', '00126380')).status).toBe('unavailable')
    fetcher.mockClear()
    expect((await new DartClient(fetcher).loadDisclosures('000000', null)).status).toBe('mapping_unavailable')
    expect(fetcher).not.toHaveBeenCalled()
  })
})
