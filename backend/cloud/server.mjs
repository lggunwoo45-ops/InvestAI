import { join, isAbsolute } from 'node:path'
import { createHmac, randomUUID } from 'node:crypto'
import { openAccounts, CloudError, fail, digest } from './accounts.mjs'
import { createMemberTelegram } from './telegram.mjs'
import { createPriceAlerts } from './prices.mjs'
import { createMonitorHandler } from '../monitor/server.mjs'
import { createQuoteReader } from '../monitor/quotes.mjs'
import { createHistoryReader } from '../research/history.mjs'
import { createEmailDelivery } from './emailDelivery.mjs'

const principal=Symbol('authenticated cloud owner')
const headers={ 'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',Vary:'Origin' }
const send=(res,status,value)=>{res.writeHead(status,headers);res.end(JSON.stringify(value))}
async function readBody(req, limit=220_000) {
  if(req.headers['x-investai-cloud']!=='1' || !String(req.headers['content-type']).startsWith('application/json')) fail(400,'요청 형식을 확인해주세요.')
  const chunks=[];let size=0
  for await(const chunk of req){size+=chunk.length;if(size>limit)fail(413,'요청 크기를 초과했습니다.');chunks.push(chunk)}
  try{const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();return value}catch{fail(400,'요청을 읽을 수 없습니다.')}
}
function coalesce(reader,ttl,clock){
  const cache=new Map()
  return (...args)=>{
    const key=JSON.stringify(args), prior=cache.get(key)
    if(prior && prior.until>clock())return prior.promise
    if(cache.size>=500) for(const [k,v] of cache) if(v.until<=clock())cache.delete(k)
    if(cache.size>=500)return Promise.reject(new Error('자료 조회가 많습니다.'))
    const promise=Promise.resolve().then(()=>reader(...args)).catch(e=>{cache.delete(key);throw e})
    cache.set(key,{promise,until:clock()+ttl});return promise
  }
}
export function createCloudHandler({ directory=process.env.INVESTAI_CLOUD_DIRECTORY, secret=process.env.INVESTAI_CLOUD_KEY, origins=[], env=process.env, clock=Date.now, quoteReader=createQuoteReader(), historyReader=createHistoryReader(), derivativeContextReader=null, fetcher=fetch, monitorOptions={}, autoStart=true, leaseWaitMs=35_000 }={}) {
  const enabled=!!directory && isAbsolute(directory) && /^[a-f0-9]{64}$/i.test(secret ?? '')
  let accounts,telegram,prices,fatal=null,closing=false,ready,maintenanceBusy=false,ownsLease=false
  const workerId=randomUUID()
  const monitors=new Map(), rates=new Map(), timers=[], mailJobs=new Set()
  const emailDelivery=createEmailDelivery({env,fetcher})
  const requireEmail=()=>{if(!emailDelivery.available)fail(503,'인증메일 발송 준비 중입니다. 복구 코드를 이용해주세요.');if(mailJobs.size>=8)fail(429,'인증메일 요청을 처리 중입니다. 잠시 후 다시 시도해주세요.')}
  const queueEmail=job=>{
    if(!job.delivery)return job.response
    // Respond before contacting the provider; reset requests never reveal whether an address has an account.
    const work=Promise.resolve().then(async()=>{
      try{await emailDelivery.send(job.delivery);accounts.email.delivered(job.response.challenge)}
      catch{accounts.email.failed(job.response.challenge);console.warn('[member-email] delivery_unconfirmed')}
    }).finally(()=>mailJobs.delete(work))
    mailJobs.add(work);return job.response
  }
  const quotes=coalesce(quoteReader,10_000,clock), history=coalesce(historyReader,25_000,clock)
  const derivativeContexts=derivativeContextReader ? coalesce(derivativeContextReader,25_000,clock) : null
  const assertLease=()=>{if(fatal)throw new Error(fatal);const lease=accounts.db.prepare('SELECT * FROM worker WHERE id=1').get();if(!lease||lease.owner!==workerId||lease.expires<=clock())throw new Error('감시 실행 권한이 만료되었습니다.');accounts.db.prepare('UPDATE worker SET expires=? WHERE id=1 AND owner=?').run(clock()+30000,workerId)}
  const getMonitor=async owner=>{
    if(!monitors.has(owner)){
      const promise=(async()=>{
        const handler=createMonitorHandler({...monitorOptions,directory:join(directory,'members',owner),quoteReader:quotes,historyReader:history,derivativeContextReader:derivativeContexts,channel:telegram.channel(owner),clock,autoStart,cloud:true,authorize:req=>req[principal]===owner,
          storeFactory:async()=>({data:JSON.parse(accounts.db.prepare('SELECT value FROM monitors WHERE owner=?').get(owner)?.value??'{"version":1,"rules":[]}'),close:async()=>{},save:async next=>{
            const value=JSON.stringify(next);if(value.length>5_000_000)throw new Error('감시 저장 한도에 도달했습니다.')
            accounts.db.exec('BEGIN IMMEDIATE');try{assertLease();accounts.db.prepare('INSERT INTO monitors VALUES(?,?) ON CONFLICT(owner) DO UPDATE SET value=excluded.value').run(owner,value);accounts.db.exec('COMMIT')}catch(e){accounts.db.exec('ROLLBACK');throw e}
          }})})
        try{await handler.ready;await handler.prepareVault(createHmac('sha256',secret).update(`member-vault:${owner}`).digest('hex'));return handler}
        catch(e){await handler.close();throw e}
      })()
      monitors.set(owner,promise)
    }
    return monitors.get(owner)
  }
  const rate=(key,limit,windowMs)=>{
    const now=clock()
    for(const [k,v] of rates)if(v.until<=now)rates.delete(k)
    if(!rates.has(key)){if(rates.size>=2000)fail(429,'요청이 많습니다. 잠시 후 다시 시도해주세요.');rates.set(key,{count:0,until:now+windowMs})}
    if(++rates.get(key).count>limit)fail(429,'요청이 많습니다. 잠시 후 다시 시도해주세요.')
  }
  ready=(async()=>{
    if(!enabled)return
    accounts=openAccounts(directory,clock,{emailSecret:secret})
    // A durable lease fences writes after crashes or accidentally starting two workers.
    const deadline=Date.now()+leaseWaitMs
    while(!ownsLease){
      accounts.db.exec('BEGIN IMMEDIATE')
      let delay=0
      try{
        const prior=accounts.db.prepare('SELECT * FROM worker WHERE id=1').get()
        if(prior&&prior.expires>clock())delay=Math.min(1000,prior.expires-clock())
        else{accounts.db.prepare('INSERT INTO worker VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner,expires=excluded.expires').run(workerId,clock()+30000);ownsLease=true}
        accounts.db.exec('COMMIT')
      }catch(e){accounts.db.exec('ROLLBACK');throw e}
      if(!ownsLease){
        if(closing||Date.now()>=deadline)throw new Error('다른 감시 프로세스가 실행 중입니다.')
        await new Promise(resolve=>setTimeout(resolve,Math.min(delay,deadline-Date.now())))
      }
    }
    const renew=setInterval(()=>{try{const result=accounts.db.prepare('UPDATE worker SET expires=? WHERE id=1 AND owner=? AND expires>?').run(clock()+30000,workerId,clock());if(!result.changes)fatal='회원 감시 실행 권한이 만료되어 중지했습니다.'}catch{fatal='회원 감시 저장소에 연결하지 못했습니다.'}},5000);renew.unref();timers.push(renew)
    telegram=createMemberTelegram(accounts,{env,fetcher,clock,guard:assertLease});prices=createPriceAlerts(accounts,{quoteReader:quotes,telegram,clock,guard:assertLease})
    for(const user of accounts.users())await getMonitor(user.id)
  })().catch(()=>{fatal='회원 저장소를 열지 못했습니다. 저장 공간·암호화 설정·단일 실행 여부를 확인해주세요.'})
  const tick=async()=>{await ready;if(fatal||closing||!enabled)return;assertLease();await prices.tick()}
  const dispatch=async()=>{await ready;if(fatal||closing||!enabled||maintenanceBusy)return;assertLease();maintenanceBusy=true;try{await telegram.tick();await prices.dispatch()}finally{maintenanceBusy=false}}
  if(autoStart){const a=setInterval(()=>{void tick().catch(()=>{fatal='감시 기록 저장 오류로 회원 감시를 중지했습니다.'})},15_000),b=setInterval(()=>{void dispatch().catch(()=>{fatal='알림 기록 저장 오류가 발생했습니다.'})},5000);a.unref();b.unref();timers.push(a,b)}
  const handler=async(req,res,next=()=>send(res,404,{error:'없는 경로입니다.'}))=>{
    const path=(req.url??'').split('?')[0]
    if(!path.startsWith('/api/cloud'))return next()
    const origin=req.headers.origin,local=/^(127\.0\.0\.1|localhost):\d+$/.test(req.headers.host??'') && ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)
    if(origin && !(origins.includes(origin)||local&&origin===`http://${req.headers.host}`))return send(res,403,{error:'허용되지 않은 사이트입니다.'})
    if(origin)res.setHeader('Access-Control-Allow-Origin',origin)
    res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type, X-InvestAI-Cloud, X-InvestAI-Monitor')
    res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, OPTIONS')
    if(req.method==='OPTIONS'){res.writeHead(204,headers);res.end();return}
    await ready
    if(path==='/api/cloud/status' && req.method==='GET')return send(res,fatal?503:200,{enabled:enabled&&!fatal,signup:env.INVESTAI_CLOUD_SIGNUP==='true',emailAvailable:enabled&&!fatal&&emailDelivery.available,derivativeSignalsAvailable:enabled&&!fatal&&!!derivativeContexts,error:fatal})
    if(!enabled||fatal||closing)return send(res,503,{error:fatal??'회원 서버가 아직 연결되지 않았습니다.'})
    try{
      rate(`all:${req.socket.remoteAddress}`,2000,60_000)
      if(['/api/cloud/email/signup/request','/api/cloud/email/signup/verify','/api/cloud/email/reset/request','/api/cloud/email/reset/complete'].includes(path)&&req.method==='POST'){
        requireEmail();rate(`email:${req.socket.remoteAddress}`,30,600_000)
        const input=await readBody(req,4096)
        if(path.includes('/signup/')&&env.INVESTAI_CLOUD_SIGNUP!=='true')fail(403,'현재 신규 가입을 받지 않습니다.')
        if(path.endsWith('/signup/request'))return send(res,202,queueEmail(accounts.email.requestSignup(input,req.socket.remoteAddress)))
        if(path.endsWith('/signup/verify'))return send(res,200,accounts.email.verifySignup(input))
        if(path.endsWith('/reset/request'))return send(res,202,queueEmail(accounts.email.requestReset(input,req.socket.remoteAddress)))
        return send(res,200,await accounts.email.resetPassword(input))
      }
      if(['/api/cloud/register','/api/cloud/login','/api/cloud/recover'].includes(path)&&req.method==='POST'){
        rate(`auth:${req.socket.remoteAddress}`,30,600_000)
        const input=await readBody(req)
        rate(`account:${digest(String(input.username).toLowerCase())}`,10,600_000)
        if(path.endsWith('/register')&&env.INVESTAI_CLOUD_SIGNUP!=='true')fail(403,'현재 신규 가입을 받지 않습니다.')
        const result=await accounts[path.split('/').at(-1)](input,{requireEmail:emailDelivery.available})
        await getMonitor(result.user.id)
        return send(res,200,result)
      }
      const token=/^Bearer ([A-Za-z0-9_-]+)$/.exec(req.headers.authorization??'')?.[1],user=accounts.authenticate(token)
      rate(`user:${user.id}`,180,60_000)
      if(path.startsWith('/api/cloud/monitor')){
        if(!['GET','POST'].includes(req.method))fail(405,'지원하지 않는 요청입니다.')
        const monitor=await getMonitor(user.id),original=req.url
        req[principal]=user.id;req.url=req.url.replace('/api/cloud/monitor','/api/monitor')
        try{return await monitor(req,res)}finally{req.url=original;delete req[principal]}
      }
      if(req.method==='GET'){
        if(path==='/api/cloud/me')return send(res,200,{user,records:accounts.records(user.id),telegram:telegram.status(user.id)})
        if(path==='/api/cloud/records')return send(res,200,{records:accounts.records(user.id)})
        if(path==='/api/cloud/telegram')return send(res,200,telegram.status(user.id))
        if(path==='/api/cloud/prices')return send(res,200,{rules:prices.list(user.id)})
        if(path==='/api/cloud/export')return send(res,200,{version:1,exportedAt:clock(),user,records:accounts.records(user.id),prices:prices.list(user.id)})
      }
      if(!['POST','PUT'].includes(req.method))fail(405,'지원하지 않는 요청입니다.')
      const input=await readBody(req,path==='/api/cloud/records'&&req.method==='PUT'?8_100_000:path.startsWith('/api/cloud/email/')?4096:220_000)
      if(path==='/api/cloud/email/link/request'){requireEmail();rate(`email-link:${user.id}`,10,600_000);return send(res,202,queueEmail(await accounts.email.requestLink(user.id,input)))}
      if(path==='/api/cloud/email/link/verify'){requireEmail();accounts.email.verifyLink(user.id,input);return send(res,200,{user:accounts.authenticate(token)})}
      if(path==='/api/cloud/logout'){accounts.logout(token,input.all===true);return send(res,200,{ok:true})}
      if(path==='/api/cloud/records'&&req.method==='PUT')return send(res,200,accounts.putRecord(user.id,input))
      if(path==='/api/cloud/prices')return send(res,200,{rules:prices.register(user.id,input)})
      if(path==='/api/cloud/prices/stop')return send(res,200,{rules:prices.stop(user.id,input.id)})
      if(path==='/api/cloud/telegram/pair'){rate(`pair:${user.id}`,5,600_000);return send(res,200,telegram.pair(user.id))}
      if(path==='/api/cloud/telegram/disconnect'){telegram.disconnect(user.id);return send(res,200,telegram.status(user.id))}
      if(path==='/api/cloud/telegram/test'){rate(`test:${user.id}`,3,600_000);await telegram.test(user.id);return send(res,200,{ok:true})}
      fail(404,'없는 경로입니다.')
    }catch(e){send(res,e instanceof CloudError?e.status:503,{error:e instanceof CloudError?e.message:'요청을 완료하지 못했습니다. 저장 상태와 서버 연결을 확인해주세요.'})}
  }
  handler.ready=ready;handler.tick=tick;handler.dispatch=dispatch;handler.emailDrain=()=>Promise.all([...mailJobs])
  handler.close=async()=>{closing=true;await ready;timers.forEach(clearInterval);await prices?.close();await handler.emailDrain();while(maintenanceBusy)await new Promise(r=>setTimeout(r,20));for(const monitor of monitors.values())await monitor.then(m=>m.close()).catch(()=>{});if(accounts){if(ownsLease)accounts.db.prepare('DELETE FROM worker WHERE id=1 AND owner=?').run(workerId);accounts.close()}}
  return handler
}
