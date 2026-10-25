import { randomUUID } from 'node:crypto'
import { fail } from './accounts.mjs'
import { researchAssets as assets } from '../research/server.mjs'

export function createPriceAlerts(accounts, { quoteReader, telegram, clock=Date.now,guard=()=>{} }) {
  const db=accounts.db
  let busy=false, sending=false, closed=false
  const list=owner=>db.prepare('SELECT value FROM prices WHERE owner=? ORDER BY rowid DESC').all(owner).map(r=>JSON.parse(r.value))
  const save=r=>{guard();return db.prepare('UPDATE prices SET value=? WHERE id=? AND owner=?').run(JSON.stringify(r),r.id,r.owner)}
  // Restart is a gap, not evidence that a threshold was crossed.
  for(const row of db.prepare('SELECT value FROM prices').all()) { const r=JSON.parse(row.value); r.last=null; for(const e of r.events) if(e.delivery==='sending') e.delivery='uncertain'; save(r) }
  return {
    list:owner=>list(owner).map(({owner:_,...r})=>r),
    register(owner,input) {
      guard()
      const asset=input.asset, above=input.above, below=input.below
      if (!assets.includes(asset) || ![above,below].every(n=>n===null || typeof n==='number' && Number.isFinite(n) && n>0) || above===null && below===null || above!==null && below!==null && above<=below || typeof input.notify!=='boolean') fail(400,'가격 조건을 확인해주세요.')
      if (input.notify && !telegram.channel(owner).configured) fail(400,'먼저 Telegram을 연결해주세요.')
      const previous=list(owner)
      if(previous.length>=100) fail(400,'감시 기록 100건에 도달했습니다. 기록을 내보내고 운영자에게 문의해주세요.')
      if(previous.filter(r=>r.active && r.asset!==asset).length>=10) fail(400,'동시에 10개 종목까지 감시할 수 있습니다.')
      let review=null
      if(input.reviewId) {
        const rows=JSON.parse(db.prepare('SELECT value FROM records WHERE owner=? AND key=?').get(owner,'investai.research.observations.v1')?.value ?? '[]')
        review=rows.find(r=>r.id===input.reviewId && r.asset===asset)
        if(!review) fail(400,'저장한 검토 기록을 먼저 동기화해주세요.')
      }
      const rule={id:randomUUID(),owner,asset,above,below,notify:input.notify,review,createdAt:clock(),active:true,last:null,checkedAt:null,issue:null,events:[]}
      db.exec('BEGIN IMMEDIATE')
      try { for(const r of previous.filter(r=>r.active && r.asset===asset)){r.active=false; r.stoppedAt=clock(); save(r)} db.prepare('INSERT INTO prices VALUES(?,?,?)').run(rule.id,owner,JSON.stringify(rule)); db.exec('COMMIT') } catch(e){db.exec('ROLLBACK');throw e}
      return this.list(owner)
    },
    stop(owner,id) { const rule=list(owner).find(r=>r.id===id); if(!rule) fail(404,'가격 감시를 찾지 못했습니다.'); rule.active=false; rule.stoppedAt=clock(); save(rule); return this.list(owner) },
    async tick() {
      if(busy || closed) return
      busy=true
      try {
        const symbols=[...new Set(db.prepare('SELECT value FROM prices').all().map(r=>JSON.parse(r.value)).filter(r=>r.active).map(r=>r.asset))]
        for(const asset of symbols) {
          if(closed) break
          let quote=null
          try { quote=await quoteReader({venue:'binance-futures',asset,quote:'USDT',symbol:`${asset}USDT`}) } catch { /* Reset the baseline after unavailable quotes. */ }
          if(closed) break
          for(const row of db.prepare('SELECT value FROM prices').all()) {
            const r=JSON.parse(row.value)
            if(!r.active || r.asset!==asset) continue
            const old=r.last
            if(!quote || !Number.isFinite(quote.price) || quote.price<=0 || !Number.isFinite(quote.at) || !Number.isFinite(quote.receivedAt) || clock()-quote.receivedAt>90000 || quote.receivedAt>clock()+5000) {r.last=null;r.issue='시세를 확인하지 못해 판정을 보류합니다.';save(r);continue}
            r.checkedAt=clock();r.issue=null
            if(old && quote.at<=old.at) { if(clock()-old.receivedAt>90000) {r.last=null;r.issue='새 시세를 기다립니다.'} save(r);continue }
            r.last=quote
            const continuous=old && quote.receivedAt-old.receivedAt<=90000 && quote.receivedAt>=old.receivedAt
            const kind=continuous && (r.above!==null && old.price<r.above && quote.price>=r.above ? 'above' : r.below!==null && old.price>r.below && quote.price<=r.below ? 'below' : null)
            if(kind) {
              r.events.push({id:randomUUID(),kind,at:clock(),sourceAt:quote.at,price:quote.price,threshold:r[kind],delivery:r.notify?'pending':'off'})
              if(r.events.length>=100) {r.active=false;r.issue='기록 한도에 도달해 감시를 멈췄습니다.'}
            }
            save(r)
          }
        }
      } finally {busy=false}
    },
    async dispatch() {
      if(sending || closed) return
      sending=true
      try {
        const pending=db.prepare('SELECT value FROM prices').all().flatMap(row=>{const r=JSON.parse(row.value);return r.events.filter(e=>e.delivery==='pending').map(e=>[r.owner,r.id,e.id])}).slice(0,10)
        for(const [owner,ruleId,eventId] of pending) {
          if(closed) break
          // Previous sends yield to quotes and stop requests. Read the current rule before every attempt.
          const r=list(owner).find(rule=>rule.id===ruleId),e=r?.events.find(event=>event.id===eventId)
          if(!e||e.delivery!=='pending')continue
          const channel=telegram.channel(r.owner)
          if(!channel.configured) {e.delivery='off';save(r);continue}
          e.delivery='sending';save(r)
          let delivery='uncertain'
          try {await channel.send({config:{instrument:{venue:'binance-futures',symbol:`${r.asset}USDT`,quote:'USDT'},side:e.kind==='above'?'위쪽 가격 통과':'아래쪽 가격 통과'}},{...e,kind:'signal'});delivery='sent'} catch { /* Ambiguous network failure must not duplicate messages. */ }
          const current=list(r.owner).find(x=>x.id===r.id), event=current?.events.find(x=>x.id===e.id)
          if(event){event.delivery=delivery;save(current)}
        }
      } finally {sending=false}
    },
    async close(){closed=true;while(busy||sending)await new Promise(r=>setTimeout(r,20))},
  }
}
