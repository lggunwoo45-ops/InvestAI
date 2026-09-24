import { createServer } from 'node:http'
import { createDartProxyHandler } from './proxy.mjs'

const host = 'localhost'
const port = 8788
const handler = createDartProxyHandler()
const server = createServer((req, res) => handler(req, res).catch(() => {
  if (!res.headersSent) { res.statusCode = 500; res.setHeader('Content-Type', 'application/json; charset=utf-8') }
  res.end(JSON.stringify({ status: 'error', sourceMode: 'disabled', message: 'The local DART proxy failed safely.', disclosures: [], fetchedAt: null }))
}))

server.listen(port, host, () => {
  process.stdout.write(`Market Copilot local DART proxy: http://${host}:${port}\n`)
  process.stdout.write('Endpoint: /api/dart/disclosures?stockCode=005930&corpCode=00126380\n')
})
server.on('error', (error) => { process.stderr.write(`Local DART proxy could not start: ${error.message}\n`); process.exitCode = 1 })
