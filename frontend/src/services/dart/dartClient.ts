import type { DartDisclosure, DartDisclosureCategory, DartDisclosureResult, DartDisclosureStatus, DartProxyHealthResult, DartSourceMode } from '@/types/dart'
import { runtimeConfig } from '@/config/runtimeConfig'

const DEFAULT_ENDPOINT = `${runtimeConfig.dartProxyUrl}/api/dart/disclosures`
const DEFAULT_HEALTH_ENDPOINT = `${runtimeConfig.dartProxyUrl}/api/dart/health`
const statuses = new Set<DartDisclosureStatus>(['disabled', 'unavailable', 'mapping_unavailable', 'loading', 'ready', 'error'])
const sourceModes = new Set<DartSourceMode>(['live', 'mock', 'disabled'])
const categories = new Set<DartDisclosureCategory>(['periodic', 'material', 'correction', 'other'])

function unavailable(message = 'Disclosure data is unavailable.'): DartDisclosureResult {
  return { status: 'unavailable', sourceMode: 'disabled', message, disclosures: [], fetchedAt: null }
}

function unavailableHealth(): DartProxyHealthResult {
  return { status: 'unavailable', apiKeyConfigured: null, message: 'The local DART proxy is unavailable.' }
}

function parseHealth(value: unknown): DartProxyHealthResult | null {
  if (!value || typeof value !== 'object') return null
  const health = value as Record<string, unknown>
  const consistentReady = health.status === 'ready' && health.apiKeyConfigured === true
  const consistentDisabled = health.status === 'disabled' && health.apiKeyConfigured === false
  if (typeof health.message !== 'string') return null
  if (consistentReady) return { status: 'ready', apiKeyConfigured: true, message: health.message }
  if (consistentDisabled) return { status: 'disabled', apiKeyConfigured: false, message: health.message }
  return null
}

function disclosure(value: unknown): value is DartDisclosure {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return typeof item.id === 'string' && typeof item.receiptNo === 'string' && typeof item.corpCode === 'string' && typeof item.stockCode === 'string' && typeof item.corpName === 'string' && typeof item.reportName === 'string' && typeof item.submittedAt === 'string' && categories.has(item.disclosureType as DartDisclosureCategory) && (typeof item.detailUrl === 'string' || item.detailUrl === null) && (item.source === 'OpenDART' || item.source === 'mock') && typeof item.isCorrection === 'boolean' && typeof item.isMaterial === 'boolean' && typeof item.isPeriodic === 'boolean'
}

function parseResult(value: unknown): DartDisclosureResult | null {
  if (!value || typeof value !== 'object') return null
  const result = value as Record<string, unknown>
  if (!statuses.has(result.status as DartDisclosureStatus) || !sourceModes.has(result.sourceMode as DartSourceMode) || typeof result.message !== 'string' || !Array.isArray(result.disclosures) || !result.disclosures.every(disclosure) || !(typeof result.fetchedAt === 'string' || result.fetchedAt === null || result.fetchedAt === undefined)) return null
  return { status: result.status as DartDisclosureStatus, sourceMode: result.sourceMode as DartSourceMode, message: result.message, disclosures: result.disclosures, fetchedAt: typeof result.fetchedAt === 'string' ? result.fetchedAt : null }
}

export class DartClient {
  constructor(
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
    private readonly endpoint = DEFAULT_ENDPOINT,
    private readonly timeoutMs = 5_000,
    private readonly healthEndpoint = DEFAULT_HEALTH_ENDPOINT,
  ) {}

  async loadHealth(): Promise<DartProxyHealthResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await this.fetchImpl(this.healthEndpoint, { method: 'GET', signal: controller.signal, headers: { Accept: 'application/json' } })
      if (!response.ok) return unavailableHealth()
      return parseHealth(await response.json()) ?? unavailableHealth()
    } catch {
      return unavailableHealth()
    } finally { clearTimeout(timer) }
  }

  async loadDisclosures(stockCode: string, corpCode: string | null): Promise<DartDisclosureResult> {
    if (!corpCode) return { status: 'mapping_unavailable', sourceMode: 'disabled', message: 'DART corporation code mapping is not available for this instrument.', disclosures: [], fetchedAt: null }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const url = new URL(this.endpoint)
      url.searchParams.set('stockCode', stockCode)
      url.searchParams.set('corpCode', corpCode)
      const response = await this.fetchImpl(url, { method: 'GET', signal: controller.signal, headers: { Accept: 'application/json' } })
      const parsed = parseResult(await response.json())
      if (!parsed) return unavailable('The local DART proxy returned an invalid response.')
      return parsed
    } catch {
      return unavailable('The local DART proxy is unavailable.')
    } finally { clearTimeout(timer) }
  }
}

export const dartClient = new DartClient()
