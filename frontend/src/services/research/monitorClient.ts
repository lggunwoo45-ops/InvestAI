import type { DerivativeContextPoint, ExplorerConfig } from './signalExplorer'
import { localMonitorAvailable } from './monitorAvailability'
import { cloudRequest,cloudSignedIn } from '@/services/cloud/cloudClient'
import type { PublicPosition, PositionThresholds, positionEventLabels } from '../../../../backend/research/positionRisk.mjs'
export { positionRiskValues, positionBreaches, positionEventLabels, type PublicPosition, type PositionThresholds } from '../../../../backend/research/positionRisk.mjs'
export type PositionVenue = 'hyperliquid' | 'lighter' | 'binance' | 'bybit'
export interface PositionConnectionConfig { requestId: string; venue: PositionVenue; account: string; label: string; notify: boolean; thresholds: PositionThresholds }
export interface VaultStatus { configured: boolean; unlocked: boolean }
export interface PrivateConnectionInput extends Omit<PositionConnectionConfig, 'account' | 'venue'> { venue: 'binance' | 'bybit'; credentials: { apiKey: string; apiSecret: string }; consent: boolean }
export interface PositionEvent { id: string; kind: keyof typeof positionEventLabels; at: number; sourceAt: number | null; position: PublicPosition | null; detail: string; delivery: { status: 'off' | 'pending' | 'sent' | 'uncertain'; attempts: number } }
export interface PositionConnection { id: string; config: PositionConnectionConfig; createdAt: number; revision?: number; updatedAt?: number; lastAttemptAt?: number; credentialsUpdatedAt?: number; active: boolean; issue: string | null; snapshot: { receivedAt: number; sourceAt: number | null; positions: PublicPosition[] } | null; risk: Record<string, string[]>; events: PositionEvent[]; sequence: number }
export interface SignalWatchConfig { requestId: string; name: string; asset: string; notify: boolean; config: ExplorerConfig; purpose: 'opportunity' | 'opposition' | 'validation'; trialDays?: 7 | 30 | 90; trialVersion?: 'forward-1'; holdingSide: 'long' | 'short' | null; positionRef?: { connectionId: string; key: string } }
export interface SignalWatchEvent { derivatives?: DerivativeContextPoint & { method: string; source: string }; id: string; at: number; observedAt: number; price: number; signals: string[]; outcome: 'pending' | 'entered' | 'up' | 'down' | 'timeout' | 'ambiguous' | 'unresolved' | 'cancelled'; entry: number | null; entryAt: number | null; exit: number | null; exitAt: number | null; net: number | null; delivery: { status: 'off' | 'pending' | 'sent' | 'uncertain'; attempts: number } }
export interface SignalWatch { endedAt?: number; endReason?: 'period' | 'manual' | 'limit'; id: string; config: SignalWatchConfig & { version: string; derivativeVersion?: string }; hash: string; createdAt: number; active: boolean; lastAt: number | null; matched: boolean; derivativeState?: 'unknown' | 'match' | 'miss'; checkedAt: number | null; issue: string | null; events: SignalWatchEvent[] }
export interface MonitorConfig {
  requestId: string
  instrument: { venue: 'upbit' | 'binance-spot' | 'binance-futures'; asset: string; quote: string; symbol?: string }
  source: { kind: 'scenario' | 'review'; id: string; revision: string; at: number; price: number; note: string; signals: string[]; metrics?: { funding: number | null; interest: number | null; volatility: number | null }; positionId?: string }
  side: 'long' | 'short'; entry: [number, number]; target: number; stop: number; horizonHours: number; costPercent: number; notify: boolean
}
export interface MonitorQuote { price: number; at: number; receivedAt: number }
export type Outcome = 'entry' | 'target' | 'stop' | 'timeout' | 'expired' | 'unresolved' | 'cancelled'
export interface MonitorEvent { id: string; kind: Outcome; at: number; sourceAt: number | null; price: number | null; detail: string; delivery: { status: 'off' | 'pending' | 'sent' | 'uncertain'; attempts: number } }
export interface MonitorRule {
  id: string; config: MonitorConfig; hash: string; createdAt: number; phase: 'waiting' | 'tracking' | 'closed'
  last: MonitorQuote | null; entered: MonitorQuote | null; result: { kind: Outcome; at: number; price: number | null; sourceAt: number | null; grossPercent: number | null; netPercent: number | null } | null
  events: MonitorEvent[]; issue: string | null; gaps: number
}
export interface MonitorState { version: 1; running: boolean; error: string | null; now: number; lastCycleAt: number | null; intervalMs: number; channelConfigured: boolean; derivativeSignalsAvailable?: boolean; vault?: VaultStatus; rules: MonitorRule[]; signals?: SignalWatch[]; connections?: PositionConnection[] }
async function request(path: string, data?: unknown, timeout = 10_000): Promise<MonitorState> {
  if (cloudSignedIn()) return cloudRequest<MonitorState>('/monitor'+path,data)
  if (!localMonitorAvailable()) throw new Error('이 배포에서는 개인 감시 서버가 연결되지 않았습니다. PC용 InvestAI에서 이용할 수 있습니다.')
  const response = await fetch(`/api/monitor${path}`, { method: data === undefined ? 'GET' : 'POST', signal: AbortSignal.timeout(timeout), headers: data === undefined ? undefined : { 'content-type': 'application/json', 'x-investai-monitor': '1' }, body: data === undefined ? undefined : JSON.stringify(data) })
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('감시 프로그램에 연결할 수 없습니다. PC용 InvestAI를 실행해주세요.')
  const result = await response.json()
  if (!response.ok) throw new Error(result.error ?? '감시 요청을 처리하지 못했습니다.')
  if (result.version !== 1 || !Array.isArray(result.rules)) throw new Error('감시 상태를 읽을 수 없습니다.')
  return result as MonitorState
}
export const readMonitor = () => request('')
export const registerMonitor = (config: MonitorConfig) => request('/rules', config)
export const cancelMonitor = (id: string) => request('/cancel', { id })
export const registerSignalWatch = (config: SignalWatchConfig) => request('/signals', config)
export const stopSignalWatch = (id: string) => request('/signals/stop', { id })
export const connectPositions = (config: PositionConnectionConfig) => request('/connections', config)
export const pausePositionConnection = (id: string, paused: boolean) => request('/connections/pause', { id, paused })
export const removePositionConnection = (id: string) => request('/connections/remove', { id })
export const connectPrivatePositions = (input: PrivateConnectionInput) => request('/connections/private', input, 30_000)
export const updatePositionConnection = (id: string, revision: number, config: Pick<PositionConnectionConfig, 'label' | 'notify' | 'thresholds'>) => request('/connections/update', { id, revision, ...config })
export const refreshPositionConnection = (id: string, revision: number) => request('/connections/refresh', { id, revision }, 30_000)
export const replacePositionCredentials = (id: string, revision: number, credentials: PrivateConnectionInput['credentials'], consent: boolean) => request('/connections/credentials', { id, revision, credentials, consent }, 30_000)
export const setupCredentialVault = (password: string) => request('/vault/setup', { password })
export const unlockCredentialVault = (password: string) => request('/vault/unlock', { password })
export const lockCredentialVault = () => request('/vault/lock', {})
export const removeCredentialVault = () => request('/vault/remove', { confirm: true })
