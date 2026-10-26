import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp,rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { createCloudHandler } from './server.mjs'
import { openAccounts } from './accounts.mjs'
import { createMemberTelegram } from './telegram.mjs'
import { createPriceAlerts } from './prices.mjs'

const secret='1'.repeat(64),password='only-a-test-passphrase-123'
async function serve(directory,options={}){
  const handler=createCloudHandler({directory,secret,env:{INVESTAI_CLOUD_SIGNUP:'true'},origins:['https://app.example'],autoStart:false,...options})
  await handler.ready
  const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r))
  const base=`http://127.0.0.1:${server.address().port}/api/cloud`
  return {handler,async request(path,data,token,method=data===undefined?'GET':'POST',headers={}){const response=await fetch(base+path,{method,headers:{origin:'https://app.example','content-type':'application/json','x-investai-cloud':'1','x-investai-monitor':'1',...(token?{authorization:`Bearer ${token}`} : {}),...headers},body:data===undefined?undefined:JSON.stringify(data)});return {status:response.status,body:await response.json(),headers:response.headers}},async close(){await handler.close();server.closeAllConnections();await new Promise(r=>server.close(r))}}
}

test('member holdings, watchlist bundles and scenarios persist with owner isolation and version conflicts',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'investai-investments-'));let app=await serve(dir)
  try{
    const a=(await app.request('/register',{username:'investor',password})).body,b=(await app.request('/register',{username:'separate',password})).body
    const position={id:'position-1',exchange:'upbit',venue:'upbit-krw',instrumentId:'upbit-btc',symbol:'BTC',quoteCurrency:'KRW',averagePrice:100,quantity:2,targetPrice:120,stopPrice:80,ledger:{version:1,opening:{averagePrice:100,quantity:1},trades:[{id:'trade-1',side:'buy',price:100,quantity:1,fee:0,at:'2026-10-20T00:00:00.000Z'}]}}
    const value=JSON.stringify({version:2,positions:Array.from({length:700},(_,n)=>({...position,id:`position-${n}`}))})
    assert.ok(Buffer.byteLength(value)>220000)
    const key='investai.portfolio.v1'
    assert.equal((await app.request('/records',{key,value,version:0},a.token,'PUT')).status,200)
    assert.equal((await app.request('/records',{key,value:'{"version":1,"positions":[]}',version:0},a.token,'PUT')).status,409)
    assert.deepEqual((await app.request('/records',undefined,b.token)).body.records,[])
    const watch=JSON.stringify({version:1,watchlists:[{id:'crypto',name:'Crypto',isDefault:true,instrumentIds:['upbit-btc']}],items:[]})
    assert.equal((await app.request('/records',{key:'investai.watchlist-account.v1',value:watch,version:0},a.token,'PUT')).status,200)
    assert.equal((await app.request('/records',{key:'investai.scenarios.v1',value:'{"version":1,"scenarios":[],"events":[]}',version:0},a.token,'PUT')).status,200)
    await app.close();app=await serve(dir)
    const restored=(await app.request('/export',undefined,a.token)).body.records
    assert.equal(restored.find(r=>r.key===key).value,value)
    assert.equal(restored.find(r=>r.key==='investai.watchlist-account.v1').value,watch)
    assert.equal((await app.request('/records',{key,value:null,version:1},a.token,'PUT')).status,200)
    assert.equal((await app.request('/records',undefined,a.token)).body.records.find(r=>r.key===key).value,null)
  }finally{await app.close();await rm(dir,{recursive:true,force:true})}
})

test('investment records reject unknown keys, malformed envelopes and oversized data without changing prior records',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'investai-investment-bounds-')),app=await serve(dir)
  try{
    const a=(await app.request('/register',{username:'bounded',password})).body,key='investai.portfolio.v1',value='{"version":1,"positions":[]}'
    assert.equal((await app.request('/records',{key,value,version:0},a.token,'PUT')).status,200)
    for(const row of [{key:'investai.portfolio.secret',value},{key,value:'[]'},{key,value:'{"version":99,"positions":[]}'},{key:'investai.watchlist-account.v1',value:'{"version":1,"watchlists":[],"items":[{}]}'},{key:'investai.scenarios.v1',value:'{}'},{key,value:JSON.stringify({version:1,positions:[],padding:'x'.repeat(4_000_000)})}]){
      assert.equal((await app.request('/records',{...row,version:1},a.token,'PUT')).status,400)
    }
    assert.equal((await app.request('/records',undefined,a.token)).body.records.find(r=>r.key===key).value,value)
  }finally{await app.close();await rm(dir,{recursive:true,force:true})}
})
test('accounts isolate records, reject stale writes, revoke sessions and recover with a one-use code',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'investai-cloud-auth-'));const app=await serve(dir)
  try{
    const a=await app.request('/register',{username:'alice',password}),b=await app.request('/register',{username:'bobbie',password})
    assert.equal(a.status,200);assert.equal(b.status,200);assert.equal(a.body.recovery.length,32)
    const token=a.body.token,key='investai.research.draft.v1.BTC'
    assert.equal((await app.request('/records',{key,value:'private Alice note',version:0},token,'PUT')).status,200)
    assert.deepEqual((await app.request('/records',undefined,b.body.token)).body.records,[])
    assert.equal((await app.request('/records',{key,value:'stale replacement',version:0},token,'PUT')).status,409)
    assert.equal((await app.request('/records',{key:'../../another-account',value:'x',version:0},token,'PUT')).status,400)
    assert.equal((await app.request('/records',undefined,token,'GET',{origin:'https://evil.example'})).status,403)
    assert.equal((await app.request('/records',undefined)).status,401)
    assert.equal((await app.request('/monitor',undefined,b.body.token)).body.rules.length,0)
    assert.equal((await app.request('/monitor/vault/remove',{confirm:true},token)).status,400)
    const recovery=await app.request('/recover',{username:'alice',password:'a-new-test-passphrase-456',recovery:a.body.recovery})
    assert.equal(recovery.status,200);assert.notEqual(recovery.body.recovery,a.body.recovery)
    assert.equal((await app.request('/records',undefined,token)).status,401)
    assert.equal((await app.request('/recover',{username:'alice',password,recovery:a.body.recovery})).status,401)
    assert.equal((await app.request('/records',undefined,recovery.body.token)).body.records[0].value,'private Alice note')
    assert.equal((await app.request('/logout',{all:true},recovery.body.token)).status,200)
    assert.equal((await app.request('/me',undefined,recovery.body.token)).status,401)
  }finally{await app.close();await rm(dir,{recursive:true,force:true})}
})
test('server price alerts continue without a browser, retain original rules and resume safely after restart',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'investai-cloud-prices-'));let now=1800000000000,price=100,failed=false
  const options={clock:()=>now,quoteReader:async()=>{if(failed)throw new Error('offline');return {price,at:now,receivedAt:now}}}
  let app=await serve(dir,options)
  try{
    const user=(await app.request('/register',{username:'priceuser',password})).body,token=user.token
    const created=await app.request('/prices',{asset:'BTC',above:110,below:90,notify:false},token);assert.equal(created.status,200)
    assert.equal((await app.request('/prices',{asset:'BTC',above:110,below:90,notify:true},token)).status,400)
    await app.handler.tick();now+=15000;price=111;await app.handler.tick()
    let rule=(await app.request('/prices',undefined,token)).body.rules[0];assert.equal(rule.events.length,1);assert.equal(rule.events[0].threshold,110)
    now+=15000;price=112;await app.handler.tick();assert.equal((await app.request('/prices',undefined,token)).body.rules[0].events.length,1)
    now+=15000;failed=true;await app.handler.tick();now+=15000;failed=false;price=80;await app.handler.tick()
    assert.equal((await app.request('/prices',undefined,token)).body.rules[0].events.length,1)
    await app.close();app=await serve(dir,options)
    now+=15000;price=120;await app.handler.tick()
    rule=(await app.request('/prices',undefined,token)).body.rules[0];assert.equal(rule.events.length,1)
    const replacement=await app.request('/prices',{asset:'BTC',above:140,below:null,notify:false},token)
    assert.equal(replacement.body.rules.length,2);assert.equal(replacement.body.rules.find(r=>r.id===rule.id).active,false);assert.equal(replacement.body.rules.find(r=>r.id===rule.id).events[0].threshold,110)
    await app.request('/prices/stop',{id:replacement.body.rules[0].id},token);now+=15000;price=150;await app.handler.tick()
    assert.equal((await app.request('/prices',undefined,token)).body.rules[0].events.length,0)
  }finally{await app.close();await rm(dir,{recursive:true,force:true})}
})
test('member Telegram pairs only an unexpired private chat, separates destinations and unlinks immediately',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'investai-cloud-tg-')),accounts=openAccounts(dir)
  const a=await accounts.register({username:'first',password}),b=await accounts.register({username:'second',password})
  let updates=[],calls=[]
  const fetcher=async(url,init)=>{calls.push({url,body:JSON.parse(init.body)});return new Response(JSON.stringify({ok:true,result:url.endsWith('getUpdates')?updates:{message_id:1}}),{headers:{'content-type':'application/json'}})}
  const tg=createMemberTelegram(accounts,{env:{INVESTAI_TELEGRAM_BOT_TOKEN:'123456:test_token',INVESTAI_TELEGRAM_BOT_NAME:'InvestTestBot'},fetcher})
  try{
    const code=new URL(tg.pair(a.user.id).url).searchParams.get('start')
    updates=[{update_id:1,message:{text:`/start ${code}`,date:Math.floor(Date.now()/1000),chat:{id:1,type:'group'},from:{id:1}}}];await tg.tick();assert.equal(tg.status(a.user.id).connected,false)
    updates=[{update_id:2,message:{text:`/start ${code}`,date:Math.floor(Date.now()/1000),chat:{id:42,type:'private'},from:{id:42}}}];await tg.tick();assert.equal(tg.status(a.user.id).connected,true);assert.equal(tg.status(b.user.id).connected,false)
    await tg.test(a.user.id);assert.equal(calls.at(-1).body.chat_id,'42')
    await assert.rejects(()=>tg.test(b.user.id));tg.disconnect(a.user.id);await assert.rejects(()=>tg.test(a.user.id))
    assert.ok(!JSON.stringify(tg.status(a.user.id)).includes('test_token'))
  }finally{accounts.close();await rm(dir,{recursive:true,force:true})}
})
test('cloud mode stays disabled without durable storage and an encryption key',async()=>{
  const handler=createCloudHandler({directory:undefined,secret:undefined,env:{},autoStart:false});await handler.ready
  const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r))
  try{const status=await fetch(`http://127.0.0.1:${server.address().port}/api/cloud/status`);assert.equal((await status.json()).enabled,false)}finally{await handler.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
})

test('a crashed worker lease expires before takeover and a live worker cannot be duplicated',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'investai-cloud-lease-'))
  const seed=openAccounts(dir)
  seed.db.prepare('INSERT INTO worker VALUES(1,?,?)').run('crashed-worker',Date.now()+60);seed.close()
  const app=await serve(dir,{leaseWaitMs:1000})
  let duplicate
  try{
    assert.equal((await app.request('/status')).body.enabled,true)
    duplicate=await serve(dir,{leaseWaitMs:20})
    assert.equal((await duplicate.request('/status')).status,503)
    assert.equal((await app.request('/status')).body.enabled,true)
  }finally{await duplicate?.close();await app.close();await rm(dir,{recursive:true,force:true})}
})

test('member API keys remain encrypted and isolated, and the vault resumes after restart',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'investai-cloud-vault-'))
  const credentials={apiKey:'fixture_key_123456789',apiSecret:'fixture_secret_123456789'}
  const options={monitorOptions:{privateReader:async(_venue,keys)=>{assert.deepEqual(keys,credentials);return {receivedAt:Date.now(),sourceAt:null,positions:[]}}}}
  let app=await serve(dir,options)
  try{
    const first=(await app.request('/register',{username:'vaultfirst',password})).body
    const second=(await app.request('/register',{username:'vaultsecond',password})).body
    const config={requestId:'fixture-private',venue:'bybit',label:'test account',notify:false,thresholds:{distance:5,loss:10,leverage:null},consent:true,credentials}
    const linked=await app.request('/monitor/connections/private',config,first.token)
    assert.equal(linked.status,200);assert.equal(linked.body.connections.length,1)
    assert.equal((await app.request('/monitor',undefined,second.token)).body.connections.length,0)
    await app.close()
    const stored=openAccounts(dir)
    const encoded=stored.db.prepare('SELECT value FROM monitors WHERE owner=?').get(first.user.id).value
    for(const value of Object.values(credentials))assert.ok(!encoded.includes(value))
    stored.close();app=await serve(dir,options)
    const restored=(await app.request('/monitor',undefined,first.token)).body
    assert.deepEqual(restored.vault,{configured:true,unlocked:true});assert.equal(restored.connections.length,1)
    assert.equal((await app.request('/monitor/connections/remove',{id:restored.connections[0].id},second.token)).status,400)
    assert.equal((await app.request('/monitor',undefined,first.token)).body.connections.length,1)
  }finally{await app.close();await rm(dir,{recursive:true,force:true})}
})

test('sending queued alerts never restores a rule stopped during an earlier send',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'investai-cloud-outbox-')),accounts=openAccounts(dir)
  const member=await accounts.register({username:'outboxmember',password})
  let now=1800000000000,price=100,release,entered
  const started=new Promise(resolve=>{entered=resolve})
  let calls=0
  const telegram={channel:()=>({configured:true,send:async()=>{if(++calls===1){entered();await new Promise(resolve=>{release=resolve})}}})}
  const prices=createPriceAlerts(accounts,{telegram,clock:()=>now,quoteReader:async()=>({price,at:now,receivedAt:now})})
  try{
    const rule=prices.register(member.user.id,{asset:'BTC',above:110,below:90,notify:true})[0]
    for(const next of [100,111,80]){price=next;now+=15000;await prices.tick()}
    const sending=prices.dispatch();await started
    prices.stop(member.user.id,rule.id);release();await sending
    const saved=prices.list(member.user.id)[0]
    assert.equal(saved.active,false);assert.deepEqual(saved.events.map(e=>e.delivery),['sent','sent'])
  }finally{await prices.close();accounts.close();await rm(dir,{recursive:true,force:true})}
})
