import { randomUUID } from 'node:crypto'
import { positionBreaches, positionEventLabels } from '../research/positionRisk.mjs'
export { positionBreaches, positionRiskValues, positionEventLabels } from '../research/positionRisk.mjs'

const finite = value => (typeof value === 'number' || typeof value === 'string' && value.trim() !== '') && Number.isFinite(Number(value)) ? Number(value) : null
const positive = value => { const n = finite(value); return n !== null && n > 0 ? n : null }
const assetName = value => typeof value === 'string' && /^[A-Za-z0-9._:-]{1,40}$/.test(value)
const fail = () => { throw new Error('포지션 응답이 불완전해 이전 기록을 유지합니다.') }

export function normalizeConnection(value) {
  if (!value || !['hyperliquid', 'lighter', 'binance', 'bybit'].includes(value.venue) || typeof value.account !== 'string') throw new Error('연결할 거래소와 식별자를 확인해주세요.')
  const account = value.account.trim().toLowerCase()
  const validAccount = value.venue === 'hyperliquid' ? /^0x[0-9a-f]{40}$/.test(account) : value.venue === 'lighter' ? /^(0|[1-9][0-9]{0,14})$/.test(account) && Number.isSafeInteger(Number(account)) : /^key-[a-f0-9-]{36}$/.test(account)
  if (!validAccount) throw new Error('계정 식별자가 올바르지 않습니다. API 계정은 키 연결 화면을 이용해주세요.')
  if (typeof value.requestId !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(value.requestId) || typeof value.label !== 'string' || !value.label.trim() || value.label.trim().length > 40 || typeof value.notify !== 'boolean') throw new Error('연결 이름과 등록 정보를 확인해주세요.')
  const thresholds = {}
  for (const [key, max] of [['distance', 100], ['loss', 1000], ['leverage', 200]]) {
    const n = value.thresholds?.[key]
    if (n !== null && (typeof n !== 'number' || !Number.isFinite(n) || n <= 0 || n > max)) throw new Error('알림 기준을 확인해주세요. 사용하지 않는 기준은 꺼주세요.')
    thresholds[key] = n
  }
  return { requestId: value.requestId, venue: value.venue, account, label: value.label.trim(), notify: value.notify, thresholds }
}

/** Strict, allowlisted read-only public endpoints. Never log or cache account identifiers. */
export function createPositionReader(fetcher = fetch, clock = Date.now) {
  const cooldown = new Map()
  return async config => {
    normalizeConnection(config)
    if (!['hyperliquid', 'lighter'].includes(config.venue)) throw new Error('공개 계정만 조회할 수 있습니다.')
    if ((cooldown.get(config.venue) ?? 0) > clock()) throw new Error('거래소 요청 제한으로 다음 조회를 기다립니다.')
    const hl = config.venue === 'hyperliquid'
    const response = await fetcher(hl ? 'https://api.hyperliquid.xyz/info' : `https://mainnet.zklighter.elliot.ai/api/v1/account?by=index&value=${encodeURIComponent(config.account)}&active_only=true`, { method: hl ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(8000), headers: { accept: 'application/json', ...(hl ? { 'content-type': 'application/json' } : {}) }, ...(hl ? { body: JSON.stringify({ type: 'clearinghouseState', user: config.account }) } : {}) })
    if (!response.ok) {
      if ([418, 429].includes(response.status)) cooldown.set(config.venue, clock() + Math.min(3600, Math.max(60, Number(response.headers.get('retry-after')) || 60)) * 1000)
      throw new Error('거래소에서 포지션을 가져오지 못했습니다. 다음 조회에서 다시 확인합니다.')
    }
    const reader = response.body?.getReader(); if (!reader) fail()
    const chunks = []; let bytes = 0
    try { for (;;) { const { done, value } = await reader.read(); if (done) break; bytes += value.length; if (bytes > 512000) fail(); chunks.push(value) } } finally { await reader.cancel().catch(() => {}) }
    let data; try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { fail() }
    const receivedAt = clock(), serverAt = Date.parse(response.headers.get('date') ?? ''), age = finite(response.headers.get('age') ?? '0')
    if (!Number.isFinite(serverAt) || age === null || age < 0 || age > 60) throw new Error('응답 시각을 확인할 수 없어 판정을 보류합니다.')
    let sourceAt = null, rows
    if (hl) {
      sourceAt = positive(data.time)
      if (!sourceAt || serverAt + age * 1000 - sourceAt > 90000 || sourceAt - serverAt - age * 1000 > 5000) throw new Error('거래소 포지션 시각이 오래되어 판정을 보류합니다.')
      if (!Array.isArray(data.assetPositions)) fail()
      rows = data.assetPositions.map(r => {
        const p = r?.position; if (!p || finite(p.szi) === null) fail()
        return { asset: p.coin, size: finite(p.szi), entry: p.entryPx, value: p.positionValue, pnl: p.unrealizedPnl, liquidation: p.liquidationPx, leverage: p.leverage?.value, marginType: ['cross', 'isolated'].includes(p.leverage?.type) ? p.leverage.type : 'unknown' }
      })
    } else {
      if (data.code !== 200 || data.next_cursor || !Array.isArray(data.accounts) || data.accounts.length !== 1 || Number(data.total) !== 1) fail()
      const account = data.accounts[0]
      if (String(account.account_index ?? account.index) !== config.account || !Array.isArray(account.positions)) fail()
      rows = account.positions.map(p => {
        const size = finite(p.position)
        if (size === null || size < 0 || size > 0 && ![1, -1].includes(p.sign)) fail()
        return { asset: p.symbol, size: size * (p.sign || 1), entry: p.avg_entry_price, value: p.position_value, pnl: p.unrealized_pnl, liquidation: p.liquidation_price, leverage: null, marginType: 'unknown' }
      })
    }
    if (rows.length > 200) fail()
    const positions = rows.filter(p => p.size !== 0).map(p => {
      const entryPrice = positive(p.entry), notional = positive(Math.abs(finite(p.value) ?? NaN)), unrealizedPnl = finite(p.pnl)
      if (!assetName(p.asset) || !entryPrice || !notional || unrealizedPnl === null) fail()
      const currentPrice = notional / Math.abs(p.size)
      if (!Number.isFinite(currentPrice) || currentPrice <= 0) fail()
      return { key: `${p.asset}:${p.size > 0 ? 'long' : 'short'}`, asset: p.asset, side: p.size > 0 ? 'long' : 'short', size: p.size, entryPrice, currentPrice, liquidationPrice: positive(p.liquidation), unrealizedPnl, leverage: positive(p.leverage), marginType: p.marginType, quote: 'USDC' }
    })
    if (new Set(positions.map(p => p.key)).size !== positions.length) fail()
    return { receivedAt, sourceAt, positions }
  }
}

export function createConnection(config, now) { return { id: randomUUID(), config, createdAt: now, revision: 0, active: true, snapshot: null, issue: null, risk: {}, events: [], sequence: 0 } }
export function observeConnection(connection, snapshot, now, issue = null) {
  if (!connection.active) return
  if (issue || !validPositionSnapshot(snapshot) || now - snapshot.receivedAt > 90000 || snapshot.receivedAt - now > 5000) { connection.issue = issue ?? '포지션 자료가 오래되어 판정을 보류합니다.'; return }
  if (connection.snapshot && (snapshot.receivedAt <= connection.snapshot.receivedAt || snapshot.sourceAt !== null && connection.snapshot.sourceAt !== null && snapshot.sourceAt < connection.snapshot.sourceAt)) return
  const previous = connection.snapshot
  const gap = previous && (now - previous.receivedAt > 120000 || connection.issue)
  const emit = (kind, p, detail) => {
    if (connection.events.length >= 200) { connection.active = false; connection.issue = '연결 기록 200건에 도달해 감시를 멈췄습니다. 기록을 내보낸 뒤 연결을 지우고 다시 등록해주세요.'; return }
    connection.events.push({ id: `${connection.id}:${++connection.sequence}`, kind, at: now, sourceAt: snapshot.sourceAt, position: p, detail, delivery: { status: connection.config.notify ? 'pending' : 'off', attempts: 0 } })
  }
  connection.issue = null
  if (gap) emit('resynced', null, '확인하지 못한 구간의 신규 진입·종료 순서는 판정하지 않습니다.')
  for (const p of snapshot.positions) {
    const old = previous?.positions.find(v => v.key === p.key)
    if (!previous) emit('initial', p, '연결 전에 열린 포지션입니다. 진입 시각과 체결 내역은 조회하지 않았습니다.')
    else if (!gap && !old) emit('opened', p, '이전 조회에 없던 포지션입니다. 조회 사이의 실제 체결 시각은 알 수 없습니다.')
    else if (!gap && old && Math.abs(p.size - old.size) > Math.max(1e-10, Math.abs(old.size) * 1e-8)) emit('resized', p, `관측 수량 ${Math.abs(old.size)} → ${Math.abs(p.size)}`)
    const breached = positionBreaches(p, connection.config.thresholds)
    for (const key of breached) if (!old || !connection.risk[p.key]?.includes(key)) emit(key === 'distance' ? 'liquidation' : key, p, `${key === 'distance' ? '청산 거리' : key === 'loss' ? '진입금액 대비 미실현 손실' : '설정 레버리지'} 기준 ${connection.config.thresholds[key]}${key === 'leverage' ? '배' : '%'}. 주문·체결 결과가 아닌 조회 값입니다.`)
    connection.risk[p.key] = breached
  }
  if (previous && !gap) for (const p of previous.positions) if (!snapshot.positions.some(v => v.key === p.key)) emit('closed', p, '포지션 목록에서 사라졌습니다. 청산·수동 종료·방향 전환 여부와 확정 손익은 확인되지 않았습니다.')
  for (const key of Object.keys(connection.risk)) if (!snapshot.positions.some(p => p.key === key)) delete connection.risk[key]
  connection.snapshot = snapshot
}
export function validPositionSnapshot(s) {
  return !!s && positive(s.receivedAt) !== null && (s.sourceAt === null || positive(s.sourceAt) !== null) && Array.isArray(s.positions) && s.positions.length <= 200 && new Set(s.positions.map(p => p.key)).size === s.positions.length && s.positions.every(p => assetName(p.asset) && ['long', 'short'].includes(p.side) && p.key === `${p.asset}:${p.side}` && Number.isFinite(p.size) && p.size !== 0 && (p.size > 0) === (p.side === 'long') && positive(p.entryPrice) && positive(p.currentPrice) && (p.liquidationPrice === null || positive(p.liquidationPrice)) && Number.isFinite(p.unrealizedPnl) && (p.leverage === null || positive(p.leverage)) && ['cross', 'isolated', 'unknown'].includes(p.marginType) && ['USDC', 'USDT'].includes(p.quote))
}
export function validConnection(c) {
  try {
    if (c.revision !== undefined && (!Number.isSafeInteger(c.revision) || c.revision < 0)) return false
    for (const key of ['updatedAt', 'lastAttemptAt', 'credentialsUpdatedAt']) if (c[key] !== undefined && !positive(c[key])) return false
    return JSON.stringify(normalizeConnection(c.config)) === JSON.stringify(c.config) && typeof c.id === 'string' && !!positive(c.createdAt) && typeof c.active === 'boolean' && (c.issue === null || typeof c.issue === 'string') && (c.snapshot === null || validPositionSnapshot(c.snapshot)) && !!c.risk && typeof c.risk === 'object' && Object.values(c.risk).every(v => Array.isArray(v) && v.every(k => ['distance', 'loss', 'leverage'].includes(k))) && Number.isInteger(c.sequence) && c.sequence >= 0 && Array.isArray(c.events) && c.events.length <= 200 && new Set(c.events.map(e => e.id)).size === c.events.length && c.events.every(e => typeof e.id === 'string' && Object.hasOwn(positionEventLabels, e.kind) && !!positive(e.at) && (e.sourceAt === null || !!positive(e.sourceAt)) && typeof e.detail === 'string' && (e.position === null || validPositionSnapshot({ receivedAt: e.at, sourceAt: e.sourceAt, positions: [e.position] })) && ['off', 'pending', 'sent', 'uncertain'].includes(e.delivery?.status) && Number.isInteger(e.delivery.attempts) && e.delivery.attempts >= 0)
  } catch { return false }
}
