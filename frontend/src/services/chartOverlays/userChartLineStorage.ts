import type { UserChartLine, UserChartLineInput } from '@/types/chartOverlays'

export const USER_CHART_LINE_STORAGE_KEY = 'market-copilot.userChartLines.v1'
export const USER_CHART_LINE_SCHEMA_VERSION = 1

interface UserChartLinePayload {
  schemaVersion: typeof USER_CHART_LINE_SCHEMA_VERSION
  linesByInstrument: Record<string, readonly UserChartLine[]>
}

type ReadStorage = Pick<Storage, 'getItem' | 'removeItem'>
type WriteStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isTimestamp = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value))
const isPositivePrice = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0

export function isUserChartLine(value: unknown): value is UserChartLine {
  if (!isRecord(value)) return false
  return typeof value.id === 'string'
    && value.id.length > 0
    && typeof value.instrumentId === 'string'
    && value.instrumentId.length > 0
    && typeof value.label === 'string'
    && value.label.trim().length > 0
    && isPositivePrice(value.price)
    && isTimestamp(value.createdAt)
    && isTimestamp(value.updatedAt)
    && typeof value.visible === 'boolean'
}

function isPayload(value: unknown): value is UserChartLinePayload {
  if (!isRecord(value) || value.schemaVersion !== USER_CHART_LINE_SCHEMA_VERSION || !isRecord(value.linesByInstrument)) return false
  return Object.entries(value.linesByInstrument).every(([instrumentId, lines]) => (
    instrumentId.length > 0
    && Array.isArray(lines)
    && lines.every((line) => isUserChartLine(line) && line.instrumentId === instrumentId)
  ))
}

function emptyPayload(): UserChartLinePayload {
  return { schemaVersion: USER_CHART_LINE_SCHEMA_VERSION, linesByInstrument: {} }
}

function readPayload(storage: ReadStorage): UserChartLinePayload {
  try {
    const raw = storage.getItem(USER_CHART_LINE_STORAGE_KEY)
    if (!raw) return emptyPayload()
    const parsed: unknown = JSON.parse(raw)
    if (!isPayload(parsed)) throw new Error('Invalid user chart line payload')
    return parsed
  } catch {
    try { storage.removeItem(USER_CHART_LINE_STORAGE_KEY) } catch { /* Keep the chart usable if storage is unavailable. */ }
    return emptyPayload()
  }
}
export function loadUserChartLines(instrumentId: string, storage: ReadStorage = window.localStorage): readonly UserChartLine[] {
  if (!instrumentId) return []
  return readPayload(storage).linesByInstrument[instrumentId] ?? []
}

export function saveUserChartLines(instrumentId: string, lines: readonly UserChartLine[], storage: WriteStorage = window.localStorage): void {
  if (!instrumentId || !lines.every((line) => isUserChartLine(line) && line.instrumentId === instrumentId)) return
  const current = readPayload(storage)
  const linesByInstrument = { ...current.linesByInstrument }
  if (lines.length === 0) delete linesByInstrument[instrumentId]
  else linesByInstrument[instrumentId] = lines
  try {
    storage.setItem(USER_CHART_LINE_STORAGE_KEY, JSON.stringify({ schemaVersion: USER_CHART_LINE_SCHEMA_VERSION, linesByInstrument }))
  } catch { /* In-memory editing remains available. */ }
}

function fallbackId(instrumentId: string, now: string): string {
  const random = Math.random().toString(36).slice(2, 9)
  return `${instrumentId}:${now}:${random}`
}

export function createUserChartLine(
  instrumentId: string,
  input: UserChartLineInput,
  options: { now?: string; id?: string } = {},
): UserChartLine | null {
  const label = input.label.trim()
  if (!instrumentId || !label || !isPositivePrice(input.price)) return null
  const now = options.now ?? new Date().toISOString()
  if (!isTimestamp(now)) return null
  return {
    id: options.id ?? (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : fallbackId(instrumentId, now)),
    instrumentId,
    label,
    price: input.price,
    createdAt: now,
    updatedAt: now,
    visible: true,
  }
}
