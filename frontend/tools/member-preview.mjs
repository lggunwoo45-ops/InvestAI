// Isolated local UI verification. Never reads the owner's existing account or monitor records.
import { randomBytes } from 'node:crypto'
import { mkdtemp,mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createServer } from 'vite'
const root=fileURLToPath(new URL('../../.local-data/',import.meta.url))
await mkdir(root,{recursive:true})
process.env.INVESTAI_CLOUD_DIRECTORY=await mkdtemp(join(root,'member-preview-'))
process.env.INVESTAI_LOCAL_MONITOR_DIRECTORY=join(process.env.INVESTAI_CLOUD_DIRECTORY,'local-monitor')
process.env.INVESTAI_CLOUD_KEY=randomBytes(32).toString('hex')
process.env.INVESTAI_CLOUD_SIGNUP='true'
delete process.env.INVESTAI_TELEGRAM_BOT_TOKEN
delete process.env.INVESTAI_TELEGRAM_BOT_NAME
const server=await createServer({server:{host:'127.0.0.1',port:4193,strictPort:true}})
await server.listen();console.log('Isolated member preview: http://127.0.0.1:4193/research')
const close=()=>{void server.close().then(()=>process.exit(0))}
process.on('SIGINT',close);process.on('SIGTERM',close)
