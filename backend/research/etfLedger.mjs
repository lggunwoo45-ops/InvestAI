export const ETF_KEY = 'investai.etf-ledger.v1'
const dateOk = date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date
const valueOk = r => r && typeof r.flow === 'number' && Number.isFinite(r.flow) && Math.abs(r.flow) <= 1e12 && typeof r.source === 'string' && r.source.trim().length > 0 && r.source.length <= 300 && !/[\r\n\u0000]/.test(r.source)
export function validEtfLedger(data) {
  return data?.version === 1 && Array.isArray(data.rows) && data.rows.length <= 1000 && data.rows.every(r => r && ['BTC', 'ETH'].includes(r.asset) && dateOk(r.date) && valueOk(r) && Number.isSafeInteger(r.updatedAt) && r.updatedAt > 0 && Number.isSafeInteger(r.revision) && r.revision >= 1 && Array.isArray(r.previous) && r.previous.length <= 5 && r.previous.every(p => valueOk(p) && Number.isSafeInteger(p.updatedAt) && p.updatedAt > 0)) && new Set(data.rows.map(r => `${r.asset}:${r.date}`)).size === data.rows.length
}
export function parseEtfCsv(text, now = Date.now()) {
  if (typeof text !== 'string' || !text.trim() || text.length > 30000) throw new Error('날짜·순유입액·출처를 입력해주세요. 최대 30,000자까지 지원합니다.')
  const rows = text.trim().split(/\r?\n/).map(line => {
    const match = /^(\d{4}-\d{2}-\d{2}),\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*,(.*)$/.exec(line.trim())
    if (!match) throw new Error('날짜, 순유입액(USD), 출처 순서를 확인해주세요. 금액에는 쉼표를 넣지 마세요.')
    let source = match[3].trim()
    if (source.startsWith('"')) { if (!/^"(?:[^"]|"")*"$/.test(source)) throw new Error('출처의 따옴표를 확인해주세요.'); source = source.slice(1, -1).replaceAll('""', '"') }
    const row = { date: match[1], flow: Number(match[2]), source }
    if (!dateOk(row.date) || row.date > new Date(now).toISOString().slice(0, 10) || !valueOk(row)) throw new Error('실제 날짜·유한한 금액·출처를 확인해주세요. 미래 날짜는 확정 자료로 저장할 수 없어요.')
    return row
  })
  if (new Set(rows.map(r => r.date)).size !== rows.length) throw new Error('입력 안에 같은 날짜가 중복되어 있어요. 하루 한 값으로 정리해주세요.')
  return rows
}
export function mergeEtfRows(data, asset, rows, now = Date.now()) {
  if (!validEtfLedger(data) || !['BTC', 'ETH'].includes(asset)) throw new Error('저장된 ETF 기록을 확인해주세요.')
  const next = structuredClone(data), byDate = new Map(next.rows.filter(r => r.asset === asset).map(r => [r.date, r]))
  for (const row of rows) {
    const previous = byDate.get(row.date)
    if (previous && previous.flow === row.flow && previous.source === row.source) continue
    const entry = { asset, date: row.date, flow: row.flow, source: row.source, updatedAt: now, revision: (previous?.revision ?? 0) + 1,
      previous: previous ? [{ flow: previous.flow, source: previous.source, updatedAt: previous.updatedAt }, ...previous.previous].slice(0, 5) : [] }
    if (previous) next.rows.splice(next.rows.indexOf(previous), 1)
    next.rows.push(entry); byDate.set(row.date, entry)
  }
  next.rows.sort((a, b) => a.asset.localeCompare(b.asset) || a.date.localeCompare(b.date))
  if (!validEtfLedger(next)) throw new Error('ETF 기록은 BTC·ETH 합계 1,000일치까지 보관합니다.')
  return next
}
export function exportEtfCsv(rows) {
  // Prevent spreadsheet formula evaluation in user-supplied source cells.
  return rows.map(r => `${r.date},${r.flow},"${(/^[=+@\-\t\r]/.test(r.source) ? "'" + r.source : r.source).replaceAll('"', '""')}"`).join('\r\n')
}
