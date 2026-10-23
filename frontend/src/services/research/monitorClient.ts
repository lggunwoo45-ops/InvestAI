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
export interface MonitorState { version: 1; running: boolean; error: string | null; now: number; lastCycleAt: number | null; intervalMs: number; channelConfigured: boolean; rules: MonitorRule[] }
async function request(path: string, data?: unknown): Promise<MonitorState> {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) throw new Error('이 배포에서는 개인 감시 서버가 연결되지 않았습니다. PC용 InvestAI에서 이용할 수 있습니다.')
  const response = await fetch(`/api/monitor${path}`, { method: data === undefined ? 'GET' : 'POST', signal: AbortSignal.timeout(10_000), headers: data === undefined ? undefined : { 'content-type': 'application/json', 'x-investai-monitor': '1' }, body: data === undefined ? undefined : JSON.stringify(data) })
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('감시 프로그램에 연결할 수 없습니다. PC용 InvestAI를 실행해주세요.')
  const result = await response.json()
  if (!response.ok) throw new Error(result.error ?? '감시 요청을 처리하지 못했습니다.')
  if (result.version !== 1 || !Array.isArray(result.rules)) throw new Error('감시 상태를 읽을 수 없습니다.')
  return result as MonitorState
}
export const readMonitor = () => request('')
export const registerMonitor = (config: MonitorConfig) => request('/rules', config)
export const cancelMonitor = (id: string) => request('/cancel', { id })
