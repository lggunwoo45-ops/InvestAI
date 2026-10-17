import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { buildAiAnalysisContext } from '@/services/ai/aiAnalysisContextBuilder'
import { buildLocalAiRequest, parseLocalAiResult } from '@/services/ai/localAiClient'
import { LocalAiAnalysis } from './LocalAiAnalysis'

function fixture() {
  const context = buildAiAnalysisContext({ instrument: { id: 'upbit-btc', symbol: 'BTC/KRW', marketId: 'upbit', name: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 100, volume24h: 1000, change24hPercent: 1 }, scenario: null, marketDataMode: 'mock', newsProviderMode: 'mock', newsResult: null, language: 'en' })
  if (context.status !== 'ready') throw new Error('fixture')
  return context.input
}
afterEach(() => vi.unstubAllGlobals())
it('does not call anything on mount; sends exactly one request only after estimate and explicit consent', async () => {
  const fetcher = vi.fn(async (url: string, _options: RequestInit) => new Response(JSON.stringify(url.endsWith('/estimate')
    ? { reservedUsd: .05, inputTokenCeiling: 3500, outputTokenCeiling: 512 }
    : { status: 'unverified-ai-explanation', explanation: { summary: '<script>untrusted</script>', risks: 'May be stale', missingEvidence: 'Verified sources' }, confidence: null, disclaimer: 'Unverified', reservedUsd: .05 })))
  vi.stubGlobal('fetch', fetcher)
  render(<LocalAiAnalysis input={fixture()} language="en" />)
  expect(fetcher).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Prepare evidence and cost limit' }))
  const execute = await screen.findByRole('button', { name: 'Request one AI explanation' })
  expect(execute.hasAttribute('disabled')).toBe(true)
  expect(fetcher).toHaveBeenCalledOnce()
  expect(fetcher.mock.calls[0][0]).toBe('/api/local-ai/estimate')
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(execute); fireEvent.click(execute)
  await screen.findByRole('region', { name: 'Unverified AI result' })
  expect(fetcher).toHaveBeenCalledTimes(2)
  const body = JSON.parse(fetcher.mock.calls[1][1].body as string)
  expect(body.maxCostUsd).toBe(.05); expect(body.consent).toBe(true)
  expect(fetcher.mock.calls[1][1].headers).toEqual({ 'Content-Type': 'application/json' })
  expect(screen.getByText('<script>untrusted</script>')).toBeTruthy()
  expect(document.querySelector('script')).toBeNull()
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false)
})
it('shows disabled server state and never retries automatically', async () => {
  const fetcher = vi.fn(async () => new Response('{"error":"local_ai_disabled"}', { status: 503 }))
  vi.stubGlobal('fetch', fetcher)
  render(<LocalAiAnalysis input={fixture()} language="ko" />)
  fireEvent.click(screen.getByRole('button', { name: '자료·비용 한도 준비' }))
  expect((await screen.findByRole('alert')).textContent).toContain('꺼져 있습니다')
  await waitFor(() => expect(fetcher).toHaveBeenCalledOnce())
  expect(screen.queryByRole('checkbox')).toBeNull()
})
it('freezes reviewed evidence, excludes unrelated data and clears consent/results on instrument switch', async () => {
  const input = fixture()
  const request = buildLocalAiRequest({ ...input, scenarioContext: { ...input.scenarioContext, confidence: 95 } }, 'en')
  expect(request.evidence).not.toContain('confidence')
  expect(request.evidence).toContain('mock')
  const fetcher = vi.fn(async () => new Response('{"reservedUsd":0.05,"inputTokenCeiling":3500,"outputTokenCeiling":512}'))
  vi.stubGlobal('fetch', fetcher)
  const view = render(<LocalAiAnalysis key="btc" input={input} language="en" />)
  fireEvent.click(screen.getByRole('button', { name: 'Prepare evidence and cost limit' }))
  await screen.findByRole('checkbox'); fireEvent.click(screen.getByRole('checkbox'))
  view.rerender(<LocalAiAnalysis key="btc" input={{ ...input, quote: { ...input.quote, currentPrice: 999 } }} language="en" />)
  expect(screen.getByText(/"currentPrice":100/)).toBeTruthy()
  view.rerender(<LocalAiAnalysis key="eth" input={{ ...input, instrument: { ...input.instrument, id: 'upbit-eth', symbol: 'ETH/KRW' } }} language="en" />)
  expect(screen.queryByRole('checkbox')).toBeNull()
  expect(fetcher).toHaveBeenCalledOnce()
})
it('rejects malformed or confidence-bearing model responses', () => {
  expect(() => parseLocalAiResult({ status: 'success', confidence: 99 })).toThrow()
})
