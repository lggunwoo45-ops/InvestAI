import { randomUUID } from 'node:crypto'
import { fail } from './accounts.mjs'
import { createOpportunityHistory } from './opportunityHistory.mjs'
import { TRIAL_HOUR as H, MAX_OPPORTUNITY_TRIALS, validOpportunityTrial, evaluateOpportunityTrial, isTrialComplete, mergeTrialEvidence } from './opportunityModel.mjs'

const identity=r=>`${r.instrument.id}:${r.kind}:${r.signalCandleAt}`
export function createOpportunities(accounts,{clock=Date.now,guard=()=>{},historyReader=createOpportunityHistory()}={}) {
  const db=accounts.db,controller=new AbortController()
  let running=null,closed=false
  db.exec(`CREATE TABLE IF NOT EXISTS opportunity_trials(id TEXT PRIMARY KEY,owner TEXT NOT NULL REFERENCES users(id),value TEXT NOT NULL,next_check INTEGER NOT NULL,active INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS opportunity_owner ON opportunity_trials(owner);
    CREATE INDEX IF NOT EXISTS opportunity_due ON opportunity_trials(active,next_check);`)
  const list=owner=>db.prepare('SELECT value FROM opportunity_trials WHERE owner=? ORDER BY rowid').all(owner).map(row=>JSON.parse(row.value))
  const snapshot=owner=>({version:1,asOf:clock(),trials:list(owner)})
  const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{guard();const result=fn();db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}
  function register(owner,input) {
    if (closed) fail(503,'기록 서버가 다시 시작하는 중입니다.')
    if (!Array.isArray(input.trials) || !input.trials.length || input.trials.length>12 || JSON.stringify(input).length>60_000) fail(400,'한 번에 1~12개 후보를 기록해주세요.')
    const now=clock(),batchId=randomUUID()
    // Only fresh plans can be registered. Clients cannot upload observations or historical outcomes.
    const incoming=input.trials.map(r=>{
      if (!validOpportunityTrial(r) || r.checkedAt!==null || r.issue!==null || r.evidence.length || r.signalAt>now || now-r.signalAt>90_000) fail(400,'최신 후보를 다시 검색한 뒤 기록해주세요. 과거 결과는 올릴 수 없습니다.')
      const instrument=Object.fromEntries(['id','symbol','name','quoteCurrency','marketId','lastPrice','change24hPercent','volume24h','providerSymbol','marketType'].filter(k=>r.instrument[k]!==undefined).map(k=>[k,r.instrument[k]]))
      if(typeof r.instrument.displaySymbol==='string' && r.instrument.displaySymbol.length<=160)instrument.displaySymbol=r.instrument.displaySymbol
      const basis=r.basis.map(b=>Object.fromEntries(['frame','asOf','close','rsi','atr','volumeRatio','direction'].map(k=>[k,b[k]])))
      const t={id:randomUUID(),batchId,version:r.version,recordedAt:now,signalAt:r.signalAt,signalCandleAt:r.signalCandleAt,
        instrument,kind:r.kind,entry:[...r.entry],stop:r.stop,target:r.target,costPercent:r.costPercent,
        signalPrice:r.signalPrice,startAt:(Math.floor(now/H)+1)*H,horizonHours:24,checkedAt:null,issue:null,basis,evidence:[]}
      if (!validOpportunityTrial(t)) fail(400,'기록 조건을 확인해주세요.')
      return t
    })
    return transaction(()=>{
      const existing=list(owner),added=[];let duplicates=0
      for (const t of incoming) {
        if ([...existing,...added].some(old=>identity(old)===identity(t) || old.instrument.id===t.instrument.id && now<old.startAt+24*H && !isTrialComplete(evaluateOpportunityTrial(old,now).state))) {duplicates++;continue}
        added.push(t)
      }
      if (existing.length+added.length>MAX_OPPORTUNITY_TRIALS) fail(409,'계정 기록 100건 한도에 도달했습니다. 기존 기록을 내려받아 보관해주세요.')
      for (const t of added) db.prepare('INSERT INTO opportunity_trials VALUES(?,?,?,?,1)').run(t.id,owner,JSON.stringify(t),t.startAt+H+10_000)
      return {...snapshot(owner),added:added.length,duplicates}
    })
  }
  async function observe(row) {
    let trial=JSON.parse(row.value),now=clock()
    if (!validOpportunityTrial(trial)) throw new Error('Stored trial is invalid')
    try {trial=mergeTrialEvidence(trial,await historyReader(trial,now,controller.signal),now)}
    catch (e) {if (controller.signal.aborted) return;trial={...trial,checkedAt:now,issue:'connection'}}
    if (closed) return
    const finished=isTrialComplete(evaluateOpportunityTrial(trial,now).state)||trial.issue==='revised'
    // Retry missing evidence for seven days after the observation window, then retain an unresolved record.
    const active=!finished && now<trial.startAt+(24+7*24)*H
    const next=trial.issue?now+300_000:(Math.floor(now/H)+1)*H+10_000
    transaction(()=>db.prepare('UPDATE opportunity_trials SET value=?,next_check=?,active=? WHERE id=? AND owner=?').run(JSON.stringify(trial),next,Number(active),row.id,row.owner))
  }
  function tick() {
    if (closed || running) return running??Promise.resolve()
    guard()
    const rows=db.prepare('SELECT * FROM opportunity_trials WHERE active=1 AND next_check<=? ORDER BY next_check,rowid LIMIT 30').all(clock())
    // At most three requests at once; persisted due times keep later users from being starved.
    running=(async()=>{for(let i=0;i<rows.length&&!closed;i+=3){const settled=await Promise.allSettled(rows.slice(i,i+3).map(observe));const failed=settled.find(r=>r.status==='rejected');if(failed)throw failed.reason}})().finally(()=>{running=null})
    return running
  }
  return {snapshot,register,tick,async close(){closed=true;controller.abort();await running}}
}
