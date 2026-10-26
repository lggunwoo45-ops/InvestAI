// Local UI fixture only. Fake position/API keys never reach an exchange or production storage.
import { randomBytes } from 'node:crypto'
import { mkdtemp, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createServer } from 'vite'
import { createCloudHandler } from '../../backend/cloud/server.mjs'
const root = fileURLToPath(new URL('../../.local-data/', import.meta.url))
await mkdir(root, { recursive: true })
const directory = await mkdtemp(join(root, 'connection-preview-'))
delete process.env.INVESTAI_CLOUD_DIRECTORY
delete process.env.INVESTAI_CLOUD_KEY
delete process.env.INVESTAI_TELEGRAM_BOT_TOKEN
delete process.env.INVESTAI_TELEGRAM_BOT_NAME
process.env.INVESTAI_LOCAL_MONITOR_DIRECTORY = join(directory, 'unused-local-monitor')
const snapshot = () => ({ receivedAt: Date.now(), sourceAt: Date.now(), positions: [{ key: 'BTC:long', asset: 'BTC', side: 'long', size: 0.01, entryPrice: 68000, currentPrice: 70000, liquidationPrice: 45000, unrealizedPnl: 20, leverage: 3, marginType: 'isolated', quote: 'USDT' }] })
const handler = createCloudHandler({ directory, secret: randomBytes(32).toString('hex'), env: { INVESTAI_CLOUD_SIGNUP: 'true' }, autoStart: false, monitorOptions: { privateReader: async () => snapshot(), positionReader: async () => snapshot() } })
await handler.ready
const server = await createServer({ plugins: [{ name: 'isolated-connection-fixture', enforce: 'pre', configureServer(server) { server.middlewares.use(handler) } }], server: { host: '127.0.0.1', port: 4194, strictPort: true } })
await server.listen()
async function request(path, input, token) {
  const r = await fetch('http://127.0.0.1:4194/api/cloud' + path, { method: 'POST', headers: { 'content-type': 'application/json', 'x-investai-cloud': '1', 'x-investai-monitor': '1', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(input) })
  const data = await r.json(); if (!r.ok) throw new Error(data.error); return data
}
const member = await request('/register', { username: 'connection_demo', password: 'Demo123!' })
await request('/monitor/connections/private', { requestId: 'connection-ui-fixture', venue: 'bybit', label: '화면 검증용 계정', notify: false, thresholds: { distance: 5, loss: 10, leverage: null }, consent: true, credentials: { apiKey: 'fixture_key_not_a_real_key', apiSecret: 'fixture_secret_not_a_real_secret' } }, member.token)
await request('/logout', { all: true }, member.token)
console.log('Isolated fixture ready: http://127.0.0.1:4194/research?mode=position (test login documented in this script)')
const close = () => { void server.close().then(() => handler.close()).then(() => process.exit(0)) }
process.on('SIGINT', close); process.on('SIGTERM', close)
