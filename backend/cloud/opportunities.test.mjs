import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp,rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { openAccounts } from './accounts.mjs'
import { createOpportunities } from './opportunities.mjs'
import { createCloudHandler } from './server.mjs'
import { TRIAL_HOUR as H, evaluateOpportunityTrial } from './opportunityModel.mjs'
import { opportunityFixture as fixture,opportunityBars as bars,trialNow } from './opportunityFixtures.mjs'
const password='Test-Only-123!'
async function setup(options={}) {
  const dir=await mkdtemp(join(tmpdir(),'investai-opportunity-')),clock=()=>ctx.now
  const ctx={dir,now:trialNow,accounts:null,service:null}
  ctx.accounts=openAccounts(dir,clock)
  ctx.a=(await ctx.accounts.register({username:'alice',password})).user.id
  ctx.b=(await ctx.accounts.register({username:'bobby',password})).user.id
  ctx.open=()=>createOpportunities(ctx.accounts,{clock,...options})
  ctx.service=ctx.open()
  ctx.close=async()=>{await ctx.service.close();ctx.accounts.close();await rm(dir,{recursive:true,force:true})}
  return ctx
}
test('server receipt fixes time, rejects uploaded outcomes and foreign reads, and deduplicates atomically',async()=>{
  const c=await setup()
  try {
    c.now+=H-10_000
    const t=fixture(c.now-10_000),saved=c.service.register(c.a,{trials:[t,t]})
    assert.equal(saved.added,1);assert.equal(saved.duplicates,1)
    assert.equal(saved.trials[0].startAt,(Math.floor(c.now/H)+1)*H)
    assert.equal(saved.trials[0].recordedAt,c.now);assert.notEqual(saved.trials[0].id,t.id)
    assert.deepEqual(c.service.snapshot(c.b).trials,[])
    for (const bad of [{...t,signalAt:c.now+1},{...t,checkedAt:c.now},{...t,issue:'history'},{...t,evidence:bars(t,1)},{...t,recordedAt:c.now-100_000,signalAt:c.now-100_000}]) {
      assert.throws(()=>c.service.register(c.a,{trials:[fixture(c.now,'ETH'),bad]}),e=>e.status===400)
      assert.equal(c.service.snapshot(c.a).trials.length,1)
    }
    assert.equal(c.service.register(c.a,{trials:[fixture(c.now)]}).added,0)
  }finally{await c.close()}
})
test('observes without a browser, preserves gaps, recovers after restart and freezes ambiguous results',async()=>{
  let missing=true,calls=0
  const c=await setup({historyReader:async t=>{calls++;const rows=bars(t,3);rows[1]={...rows[1],high:110,low:95};return missing?rows.filter((_,n)=>n!==0):rows}})
  try {
    const t=c.service.register(c.a,{trials:[fixture()]}).trials[0]
    await c.service.tick();assert.equal(calls,0)
    c.now=t.startAt+3*H+20_000
    await c.service.tick()
    assert.equal(c.service.snapshot(c.a).trials[0].issue,'history')
    assert.equal(evaluateOpportunityTrial(c.service.snapshot(c.a).trials[0],c.now).state,'unresolved')
    await c.service.close();c.accounts.close();c.accounts=openAccounts(c.dir,()=>c.now);c.service=c.open()
    missing=false;c.now+=300_001
    await c.service.tick()
    const observed=c.service.snapshot(c.a).trials[0]
    assert.equal(evaluateOpportunityTrial(observed,c.now).state,'ambiguous')
    assert.deepEqual(observed.entry,t.entry);assert.equal(observed.batchId,t.batchId)
    const n=calls;c.now+=H;await c.service.tick();assert.equal(calls,n)
    assert.deepEqual(c.service.snapshot(c.b).trials,[])
  }finally{await c.close()}
})
test('provider failures retain evidence and stop retrying after the recovery window',async()=>{
  let fail=false,calls=0
  const c=await setup({historyReader:async t=>{calls++;if(fail)throw Error('offline');return bars(t,1)}})
  try {
    const t=c.service.register(c.a,{trials:[fixture()]}).trials[0]
    c.now=t.startAt+H+20_000;await c.service.tick();fail=true
    c.now+=H;await c.service.tick()
    let saved=c.service.snapshot(c.a).trials[0]
    assert.equal(saved.issue,'connection');assert.equal(saved.evidence.length,1)
    c.now=t.startAt+(24+7*24)*H;await c.service.tick()
    saved=c.service.snapshot(c.a).trials[0];assert.equal(evaluateOpportunityTrial(saved,c.now).state,'unresolved')
    const n=calls;c.now+=H;await c.service.tick();assert.equal(calls,n)
  }finally{await c.close()}
})
test('capacity never trims history and worker close aborts without a late write',async()=>{
  let started,release
  const began=new Promise(r=>{started=r})
  const deferred=new Promise(r=>{release=r})
  const c=await setup({historyReader:async()=>{started();return deferred}})
  try {
    for (let n=0;n<100;n+=10)c.service.register(c.a,{trials:Array.from({length:10},(_,i)=>fixture(c.now,`C${n+i}`))})
    assert.throws(()=>c.service.register(c.a,{trials:[fixture(c.now,'EXTRA')]}),e=>e.status===409)
    assert.equal(c.service.snapshot(c.a).trials.length,100)
    c.now+=3*H;const tick=c.service.tick();await began
    const close=c.service.close();release([])
    await Promise.race([close,new Promise((_,reject)=>setTimeout(()=>reject(Error('close timeout')),500))])
    await tick
  }finally{await c.close()}
})
test('HTTP requires authentication, isolates owners, exports observations and rejects PUT replacement',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'investai-opportunity-http-'))
  const handler=createCloudHandler({directory:dir,secret:'2'.repeat(64),env:{INVESTAI_CLOUD_SIGNUP:'true'},autoStart:false})
  await handler.ready;const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r))
  const request=async(path,data,token,method=data===undefined?'GET':'POST')=>{const r=await fetch(`http://127.0.0.1:${server.address().port}/api/cloud${path}`,{method,headers:{'content-type':'application/json','x-investai-cloud':'1',...(token?{authorization:`Bearer ${token}`}:{})},body:data===undefined?undefined:JSON.stringify(data)});return {status:r.status,data:await r.json()}}
  try {
    const status=(await request('/status')).data;assert.equal(status.opportunityTrialsAvailable,true);assert.equal(status.telegramAvailable,false);assert.equal(status.signupLimit,50)
    const a=(await request('/register',{username:'alice',password})).data,b=(await request('/register',{username:'bobby',password})).data
    assert.equal((await request('/opportunities')).status,401)
    const saved=await request('/opportunities',{trials:[fixture(Date.now())],owner:b.user.id},a.token)
    assert.equal(saved.status,200);assert.equal(saved.data.added,1)
    assert.equal((await request('/opportunities',undefined,b.token)).data.trials.length,0)
    assert.equal((await request('/export',undefined,a.token)).data.opportunities.trials.length,1)
    assert.notEqual((await request('/opportunities',{trials:[]},a.token,'PUT')).status,200)
  }finally{await handler.close();server.closeAllConnections();await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true})}
})
