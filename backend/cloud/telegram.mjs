import { randomBytes } from 'node:crypto'
import { digest, fail } from './accounts.mjs'
import { boundedJson } from '../monitor/quotes.mjs'
import { telegramChannel } from '../monitor/notifications.mjs'

export function createMemberTelegram(accounts, { env = process.env, fetcher = fetch, clock = Date.now, guard = () => {} } = {}) {
  const db = accounts.db, token = env.INVESTAI_TELEGRAM_BOT_TOKEN, bot = env.INVESTAI_TELEGRAM_BOT_NAME
  const available = /^\d+:[A-Za-z0-9_-]+$/.test(token ?? '') && /^[A-Za-z0-9_]{5,32}bot$/i.test(bot ?? '')
  let busy = false, issue = null
  async function api(method, body) {
    const response = await fetcher(`https://api.telegram.org/bot${token}/${method}`, { method:'POST', redirect:'error', headers:{'content-type':'application/json'}, body:JSON.stringify(body), signal:AbortSignal.timeout(8000) })
    const data = await boundedJson(response)
    if (!response.ok || data.ok !== true) throw new Error('Telegram 응답을 확인하지 못했습니다.')
    return data.result
  }
  function channel(owner) {
    // Resolve the destination for this owner at send time; never share an operator's chat ID.
    return {
      get configured() { return available && !!db.prepare('SELECT chat FROM telegram WHERE owner=?').get(owner)?.chat },
      async send(rule,event) {
        guard()
        const chat = db.prepare('SELECT chat FROM telegram WHERE owner=?').get(owner)?.chat
        if (!available || !chat) throw new Error('Telegram 연결이 해제되었습니다.')
        return telegramChannel({INVESTAI_TELEGRAM_ENABLED:'true',INVESTAI_TELEGRAM_BOT_TOKEN:token,INVESTAI_TELEGRAM_CHAT_ID:chat},fetcher).send(rule,event)
      },
    }
  }
  return {
    channel,
    status(owner) { return { available, connected: channel(owner).configured, issue, linkedAt:db.prepare('SELECT linked FROM telegram WHERE owner=?').get(owner)?.linked ?? null } },
    pair(owner) {
      if (!available) fail(503,'운영 서버의 Telegram 봇 설정이 아직 없습니다.')
      const code = randomBytes(24).toString('base64url')
      db.prepare('INSERT INTO telegram(owner,pair,expires) VALUES(?,?,?) ON CONFLICT(owner) DO UPDATE SET pair=excluded.pair,expires=excluded.expires').run(owner,digest(code),clock()+600_000)
      return { url:`https://t.me/${bot}?start=${code}`, expires:clock()+600_000 }
    },
    disconnect(owner) { db.prepare('DELETE FROM telegram WHERE owner=?').run(owner) },
    async test(owner) { await channel(owner).send({config:{instrument:{venue:'InvestAI',symbol:'연결 테스트',quote:''},side:''}},{id:randomBytes(8).toString('hex'),kind:'signal',price:null,at:clock()}) },
    async tick() {
      if (!available || busy) return
      busy=true
      try {
        const offset = Number(db.prepare("SELECT value FROM meta WHERE key='telegram-offset'").get()?.value ?? 0)
        const rows = await api('getUpdates',{ offset,limit:10,timeout:0,allowed_updates:['message'] })
        guard()
        if (!Array.isArray(rows)) throw new Error('Telegram 연결 응답이 올바르지 않습니다.')
        for (const row of rows) {
          if (!Number.isSafeInteger(row.update_id)) continue
          const m=row.message, code=/^\/start ([A-Za-z0-9_-]{32})$/.exec(m?.text ?? '')?.[1]
          if (code && m.chat?.type==='private' && m.chat.id===m.from?.id && Number.isSafeInteger(m.chat.id) && clock()-m.date*1000 < 600_000) {
            const link=db.prepare('SELECT owner FROM telegram WHERE pair=? AND expires>?').get(digest(code),clock())
            if(link) {
              const chat=String(m.chat.id), used=db.prepare('SELECT owner FROM telegram WHERE chat=?').get(chat)
              if(!used || used.owner===link.owner) db.prepare('UPDATE telegram SET chat=?,linked=?,pair=NULL,expires=NULL WHERE owner=?').run(chat,clock(),link.owner)
            }
          }
          db.prepare("INSERT INTO meta VALUES('telegram-offset',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(String(row.update_id+1))
        }
        issue=null
      } catch { issue='Telegram 연결 확인이 지연되고 있습니다. 봇 설정과 네트워크를 확인해주세요.' } finally {busy=false}
    },
  }
}
