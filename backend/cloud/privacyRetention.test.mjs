import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openAccounts } from './accounts.mjs'
import { createOpportunities } from './opportunities.mjs'
import { purgeExpiredAuthentication, eraseMemberOffline } from './privacyRetention.mjs'

async function fixture(t) {
  const directory=await mkdtemp(join(tmpdir(),'market-copilot-privacy-'))
  const now=Date.parse('2026-11-16T00:00:00Z'), accounts=openAccounts(directory,()=>now)
  createOpportunities(accounts,{clock:()=>now,guard:()=>{}})
  t.after(async()=>{accounts.close();await rm(directory,{recursive:true,force:true})})
  const a=await accounts.register({username:'privacy_a',password:'Private1!'}), b=await accounts.register({username:'privacy_b',password:'Private1!'})
  return {accounts,db:accounts.db,a,b,now}
}

test('expired auth data is purged without removing active sessions, member records or linked chats',async t=>{
  const {accounts,db,a,now}=await fixture(t)
  accounts.putRecord(a.user.id,{key:'investai.research.draft.v1.BTC',value:'keep note',version:0})
  db.prepare('INSERT INTO sessions VALUES(?,?,?)').run('expired',a.user.id,now)
  db.prepare('INSERT INTO telegram VALUES(?,?,?,?,?)').run(a.user.id,'linked-chat','old-pair',now-1,now-1000)
  const job=accounts.email.requestSignup({username:'unused',email:'unused@example.test'},'test')
  db.prepare('UPDATE email_challenges SET expires=?').run(now)
  db.prepare('INSERT INTO email_limits VALUES(?,?,?)').run('expired-limit',1,now)
  const counts=purgeExpiredAuthentication(db,now)
  assert.equal(counts.sessions,1);assert.equal(counts.email_challenges,1)
  assert.equal(counts.email_limits,1);assert.equal(counts.pairs,1)
  assert.equal(accounts.authenticate(a.token).id,a.user.id)
  assert.equal(accounts.records(a.user.id)[0].value,'keep note')
  assert.deepEqual({...db.prepare('SELECT chat,pair,expires FROM telegram').get()},{chat:'linked-chat',pair:null,expires:null})
  assert.throws(()=>accounts.email.verifySignup({challenge:job.response.challenge,code:job.delivery.code}))
})

test('offline erasure requires verified exact confirmation and removes one owner across stores',async t=>{
  const {accounts,db,a,b,now}=await fixture(t)
  for(const user of [a,b]){
    accounts.putRecord(user.user.id,{key:'investai.research.draft.v1.BTC',value:`note-${user.user.id}`,version:0})
    db.prepare('INSERT INTO monitors VALUES(?,?)').run(user.user.id,JSON.stringify({vault:{encrypted:'fixture'},connections:[{id:'fixture'}]}))
    db.prepare('INSERT INTO prices VALUES(?,?,?)').run(user.user.id,user.user.id,'{}')
    db.prepare('INSERT INTO opportunity_trials VALUES(?,?,?,?,?)').run(user.user.id,user.user.id,'{}',now,1)
    db.prepare('INSERT INTO email_addresses VALUES(?,?,?)').run(user.user.id,`${user.user.username}@example.test`,now)
  }
  accounts.email.requestSignup({username:a.user.username,email:'old-signup@example.test'},'test')
  assert.equal(eraseMemberOffline(db,a.user.id,{now}).applied,false)
  assert.equal(accounts.authenticate(a.token).id,a.user.id)
  assert.throws(()=>eraseMemberOffline(db,a.user.id,{now,confirmOwner:b.user.id}),/Confirmation/)
  db.prepare('INSERT INTO worker VALUES(1,?,?)').run('test-worker',now+1000)
  assert.throws(()=>eraseMemberOffline(db,a.user.id,{now,confirmOwner:a.user.id}),/Stop the member server/)
  db.prepare('DELETE FROM worker').run()
  assert.equal(eraseMemberOffline(db,a.user.id,{now,confirmOwner:a.user.id}).applied,true)
  assert.throws(()=>accounts.authenticate(a.token),/로그인/)
  assert.equal(accounts.authenticate(b.token).id,b.user.id)
  for(const table of ['records','monitors','prices','opportunity_trials','email_addresses','sessions']){
    assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE owner=?`).get(a.user.id).n,0)
    assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE owner=?`).get(b.user.id).n,1)
  }
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM email_challenges WHERE username=?').get(a.user.username).n,0)
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
})

test('unrecognized member stores fail closed before erasure',async t=>{
  const {accounts,db,a,now}=await fixture(t)
  db.exec('CREATE TABLE future_member_data(owner TEXT REFERENCES users(id), value TEXT)')
  assert.throws(()=>eraseMemberOffline(db,a.user.id,{now,confirmOwner:a.user.id}),/Unrecognized/)
  assert.equal(accounts.authenticate(a.token).id,a.user.id)
})
