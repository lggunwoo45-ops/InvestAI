// Isolated development fixture. No email leaves this process and no production accounts are read.
import { randomBytes } from 'node:crypto'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createServer } from 'vite'
import { createCloudHandler } from '../../backend/cloud/server.mjs'
import { openAccounts } from '../../backend/cloud/accounts.mjs'

const root = fileURLToPath(new URL('../../.local-data/', import.meta.url))
await mkdir(root, { recursive: true })
const directory = await mkdtemp(join(root, 'email-preview-')), secret = randomBytes(32).toString('hex')
const seed = openAccounts(directory, Date.now, { emailSecret: secret })
const account = await seed.register({ username: 'email_demo', password: 'Demo123!' })
seed.logout(account.token, true); seed.close()
delete process.env.INVESTAI_CLOUD_DIRECTORY
delete process.env.INVESTAI_CLOUD_KEY
delete process.env.INVESTAI_TELEGRAM_BOT_TOKEN
delete process.env.INVESTAI_TELEGRAM_BOT_NAME
process.env.INVESTAI_LOCAL_MONITOR_DIRECTORY = join(directory, 'unused-local-monitor')
const mailbox = []
const handler = createCloudHandler({
  directory, secret, autoStart: false,
  env: { INVESTAI_CLOUD_SIGNUP: 'true', INVESTAI_MAIL_PROVIDER: 'resend', INVESTAI_MAIL_FROM: 'accounts@example.test', INVESTAI_MAIL_API_KEY: 're_fixture_no_external_access' },
  fetcher: async (url, init) => {
    if (url !== 'https://api.resend.com/emails') throw new Error('Fixture forbids external requests')
    const mail = JSON.parse(init.body)
    if (!mail.to.every(address => address.endsWith('@example.test'))) throw new Error('Use example.test fixture addresses only')
    mailbox.push(mail); await writeFile(join(root, 'email-preview-mailbox.json'), JSON.stringify(mailbox), { mode: 0o600 })
    return Response.json({ id: 'local-fixture' })
  },
})
await handler.ready
const server = await createServer({
  plugins: [{
    name: 'isolated-email-fixture', enforce: 'pre',
    configureServer(server) { server.middlewares.use(handler) },
    transformIndexHtml() { return [{ tag: 'div', attrs: { style: 'position:fixed;bottom:8px;right:8px;padding:10px 16px;background:#fff4cc;color:#4a3500;z-index:99999;border:1px solid #d6b54f;border-radius:8px;font:14px sans-serif' }, children: '로컬 검증용 · 실제 이메일은 발송되지 않습니다', injectTo: 'body' }] },
  }],
  server: { host: '127.0.0.1', port: 4195, strictPort: true },
})
await server.listen()
console.log('Isolated email preview: http://127.0.0.1:4195/research (fixture login documented in this script)')
const close = () => { void server.close().then(() => handler.close()).then(() => process.exit(0)) }
process.on('SIGINT', close); process.on('SIGTERM', close)
