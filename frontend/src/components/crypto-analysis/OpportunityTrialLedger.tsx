import type { OpportunityTrialStore } from '@/services/cryptoAnalysis/opportunityTrialStorage'
import type { Language } from '@/i18n/translations'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/i18n/useLanguage'
import { useOpportunityTrials } from '@/hooks/useOpportunityTrials'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { evaluateOpportunityTrial, MAX_OPPORTUNITY_TRIALS, summarizeOpportunityTrials, type TrialState } from '@/services/cryptoAnalysis/opportunityTrials'
import { refreshOpportunityTrials } from '@/services/cryptoAnalysis/opportunityTrialRefresh'
import type { OpportunityKind } from '@/services/cryptoAnalysis/opportunityEngine'
import { formatAnalysisPrice } from '@/utils/formatAnalysisPrice'
import styles from './OpportunityTrialLedger.module.css'

export function OpportunityTrialLedger() {
  const {language}=useLanguage(),store=useOpportunityTrials(),{marketDataMode}=useMarketWorkspace()
  return <OpportunityTrialLedgerView key={`${store.key}:${marketDataMode}`} store={store} language={language} live={marketDataMode==='live'} />
}
export function OpportunityTrialLedgerView({store,language,live}:{store:OpportunityTrialStore;language:Language;live:boolean}) {
  const ko=language==='ko'
  const [kind,setKind]=useState<'all'|OpportunityKind>('all'),[busy,setBusy]=useState(live && !document.hidden),[error,setError]=useState(''),[clock,setClock]=useState(Date.now)
  const [limit,setLimit]=useState(10),controller=useRef<AbortController|null>(null)
  const key=store.key
  const refresh=async()=>{
    controller.current?.abort();const request=new AbortController();controller.current=request
    setBusy(true);setError('')
    try {await refreshOpportunityTrials(request.signal)} catch {if (!request.signal.aborted) setError(ko?'기록을 갱신하지 못했습니다. 원래 기록은 유지됩니다.':'Could not refresh. Existing records are preserved.')}
    finally {if (!request.signal.aborted) {setBusy(false);setClock(Date.now())}}
  }
  useEffect(()=>{
    // Visit-triggered history reconciliation, not a hidden background monitor.
    const request=new AbortController();controller.current=request
    if (live && !document.hidden) {void refreshOpportunityTrials(request.signal).catch(()=>{if (!request.signal.aborted) setError('refresh')}).finally(()=>{if (!request.signal.aborted) {setBusy(false);setClock(Date.now())}})}
    const visibility=()=>{if (document.hidden) {controller.current?.abort();setBusy(false)}}
    document.addEventListener('visibilitychange',visibility)
    return ()=>{request.abort();controller.current?.abort();document.removeEventListener('visibilitychange',visibility)}
  },[key,live])
  const summary=summarizeOpportunityTrials(store.trials,clock,kind==='all'?undefined:kind)
  const names=ko?{pullback:'상승 추세 눌림',breakout:'가격 돌파',rebound:'하락 추세 속 반등'}:{pullback:'Trend pullback',breakout:'Price breakout',rebound:'Countertrend rebound'}
  const states:Record<TrialState,string>=ko?{pending:'진입 시가 확인 대기',open:'가상 진입 · 관찰 중',target:'목표 도달',stop:'손절 도달',timeout:'24시간 관찰 종료',ambiguous:'목표·손절 순서 불명',skipped:'진입 구간 이탈 · 미진입',unresolved:'자료 확인 불가 · 집계 제외'}:{pending:'Awaiting entry bar',open:'Simulated entry · open',target:'Target reached',stop:'Stop reached',timeout:'24-hour exit',ambiguous:'Target/stop order unknown',skipped:'Outside entry zone · skipped',unresolved:'Unresolved · excluded'}
  const percent=(value:number|null)=>value===null?'—':`${value>0?'+':''}${value.toFixed(2)}%`
  const range=(low:number|null,high:number|null)=>low===high?percent(low):`${percent(low)} ~ ${percent(high)}`
  const stamp=(at:number)=>new Date(at).toLocaleString(ko?'ko-KR':'en-US')
  const selected=store.trials.filter(r=>kind==='all'||r.kind===kind).toReversed()
  const download=()=>{
    const report={format:'investai-opportunity-report-1',exportedAt:Date.now(),scope:'user-selected scans; device-local, simulated spot outcomes, not account returns',trials:store.trials,summary:summarizeOpportunityTrials(store.trials,Date.now())}
    const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=document.createElement('a')
    a.href=url;a.download='investai-opportunity-records.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
  }
  return <section className={styles.ledger} aria-label={ko?'추천 검증 기록':'Opportunity validation records'}>
    <header><div><span className={styles.eyebrow}>INVESTAI · FORWARD REVIEW</span><h1>{ko?'추천 이후, 실제 가격은 어땠나요?':'What happened after the recommendation?'}</h1><p>{ko?'기록 당시 조건을 고정하고 이후 가격으로 가상 결과를 확인합니다. 과거 결과를 보고 추천 가격을 바꾸지 않습니다.':'Freeze the original conditions and evaluate subsequent prices without changing the plan afterward.'}</p></div><Link to="/ai-analysis">{ko?'새 후보 찾기':'Find new candidates'} →</Link></header>
    <div className={styles.controls}><label>{ko?'검증할 전략':'Strategy'}<select value={kind} onChange={e=>{setKind(e.target.value as typeof kind);setLimit(10)}}><option value="all">{ko?'전체':'All'}</option>{Object.entries(names).map(([value,name])=><option key={value} value={value}>{name}</option>)}</select></label><button type="button" disabled={busy||store.error||!live||!store.trials.length} onClick={()=>void refresh()}>{ko?busy?'가격 기록 확인 중…':'이후 가격 확인':busy?'Checking history…':'Check subsequent prices'}</button><button type="button" disabled={store.error||!store.trials.length} onClick={download}>{ko?'검증 기록 내려받기':'Export records'}</button></div>
    {!live&&<p role="status">{ko?'실시간 모드에서만 실제 가격 기록을 조회합니다. 저장된 결과는 계속 볼 수 있습니다.':'Use live mode to retrieve actual history. Saved results remain visible.'}</p>}
    {(store.error||error)&&<p role="alert">{ko?store.error?'저장 기록을 읽지 못했습니다. 덮어쓰지 않고 원본을 보존했습니다.':'가격 조회 또는 저장을 마치지 못했습니다. 이후 가격 확인을 다시 눌러주세요.':'Unable to read or update records. Existing data is preserved; retry the refresh.'}</p>}
    <div className={styles.metrics}>
      <article><span>{ko?'기록 / 결과 계산':'Recorded / evaluated'}</span><strong>{summary.total} / {summary.completed}</strong></article>
      <article><span>{ko?'비용 차감 후 평균':'Mean change after costs'}</span><strong>{range(summary.meanLow,summary.meanHigh)}</strong></article>
      <article><span>{ko?'가상 결과 중 순이익 비율':'Positive simulated outcomes'}</span><strong>{range(summary.winsLow,summary.winsHigh)}</strong></article>
      <article><span>{ko?'진행 / 미진입 / 자료 부족':'Pending / skipped / unresolved'}</span><strong>{summary.pending} / {summary.skipped} / {summary.unresolved}</strong></article>
    </div>
    <p className={styles.assessment}>{ko?summary.completed<30?`완료 표본 ${summary.completed}건으로 아직 판단하기 어렵습니다. 30건 이상이어도 수익성이 입증되는 것은 아닙니다.`:'관측 표본의 결과입니다. 표본이 늘어도 미래 수익이나 계좌 수익률을 뜻하지 않습니다.':`${summary.completed} completed samples. Fewer than 30 is a small sample; reaching 30 does not validate profitability.`} {ko?`같은 봉에서 목표·손절에 모두 닿은 ${summary.ambiguous}건은 손실~이익 범위로 집계합니다.`:`${summary.ambiguous} ambiguous cases are included as loss-to-gain ranges.`}</p>
    {!store.error&&!store.trials.length&&<div className={styles.empty}><h2>{ko?'앞으로 쌓을 검증 기록입니다':'Start a forward record'}</h2><p>{ko?'종목 찾기에서 검색을 완료하고 ‘조건 충족 현물 전체 기록’을 누르세요. 이전 추천이나 성공 사례를 소급해 채우지 않습니다.':'Finish a scan and record all eligible spot setups. Past recommendations and successful examples are not backfilled.'}</p></div>}
    <div className={styles.rows}>{selected.slice(0,limit).map(trial=>{const outcome=evaluateOpportunityTrial(trial,clock),price=(n:number)=>`${formatAnalysisPrice(n,language)} ${trial.instrument.quoteCurrency}`;return <article key={trial.id} className={styles.row} data-state={outcome.state}>
      <header><div><h2>{trial.instrument.displaySymbol??trial.instrument.symbol}</h2><span>{names[trial.kind]}</span></div><strong>{states[outcome.state]}</strong></header>
      <div className={styles.result}><b>{range(outcome.netLow,outcome.netHigh)}</b><span>{ko?'왕복 비용':'Round-trip cost'} {trial.costPercent}% · {ko?'고정 가정':'fixed assumption'}</span></div>
      <p>{ko?'기록':'Recorded'} {stamp(trial.recordedAt)} · {ko?'가상 진입 시각':'Simulated entry time'} {stamp(trial.startAt)}</p>
      <dl><div><dt>{ko?'고정 진입 구간':'Frozen entry zone'}</dt><dd>{price(trial.entry[0])} – {price(trial.entry[1])}</dd></div><div><dt>{ko?'실제 시가로 가정한 진입':'Entry modeled at actual open'}</dt><dd>{outcome.entry===null?'—':price(outcome.entry)}</dd></div><div><dt>{ko?'손절 / 목표':'Stop / target'}</dt><dd>{price(trial.stop)} / {price(trial.target)}</dd></div></dl>
      {trial.issue&&<p className={styles.issue}>{ko?trial.issue==='revised'?'이전 확인값과 원본 가격 기록이 달라 판정을 보류했습니다.':trial.issue==='history'?'필요한 시간봉이 빠져 있습니다. 확인된 구간 뒤의 결과를 추측하지 않습니다.':'가격 제공처 연결을 확인하지 못했습니다. 기존 근거만 보관합니다.':`Evidence issue: ${trial.issue}. Missing or conflicting prices are not inferred.`}</p>}
      <details><summary>{ko?'기록 당시 근거·관찰 내역':'Frozen evidence and observations'}</summary><p>{ko?'추천 당시 가격':'Original quote'} {price(trial.signalPrice)} · {ko?'분석 시각':'Analyzed'} {stamp(trial.signalAt)} · {trial.version}</p>{trial.basis.map(b=><p key={b.frame}>{b.frame} · {stamp(b.asOf)} · RSI {b.rsi.toFixed(1)} · {ko?'거래량 배수':'Volume ratio'} {b.volumeRatio?.toFixed(2)??'—'}</p>)}<p>{ko?'확보한 완료 시간봉':'Recorded completed hourly bars'} {trial.evidence.length}/24 · {ko?'마지막 조회':'Last checked'} {trial.checkedAt?stamp(trial.checkedAt):'—'}</p>{outcome.at&&<p>{ko?'판정된 봉의 종료 시각':'Outcome candle close'} {stamp(outcome.at)}{outcome.exit!==null&&` · ${price(outcome.exit)}`}</p>}<p>{ko?'수정할 수 없는 가격·비용 가정입니다. 기록된 시가가 구간 밖이면 그 사례는 진입하지 않습니다.':'Price and cost assumptions are immutable. An opening price outside the entry zone means no entry.'}</p></details>
    </article>})}</div>
    {selected.length>limit&&<button type="button" onClick={()=>setLimit(v=>v+10)}>{ko?'기록 더 보기':'Show more records'}</button>}
    <details className={styles.method}><summary>{ko?'검증 방식과 저장 범위':'Evaluation and storage scope'}</summary><p>{ko?'다음 정각부터 시작되는 1시간봉의 시가가 저장 구간 안에 있을 때만 가상 진입합니다. 완료 봉으로 목표·손절을 검사하고, 24개 봉 동안 닿지 않으면 마지막 종가로 가상 종료합니다. 손절 아래로 시작한 봉은 손절가 대신 더 낮은 시가를 사용합니다. 같은 봉에서 양쪽에 닿으면 순서를 알 수 없어 범위로 표시합니다.':'Entry uses the next full hourly open only if inside the frozen zone. Completed bars determine exits; after 24 bars, the final close is used. Stop gaps use the worse opening price. Intrabar ordering ambiguity is shown as a range.'}</p><p>{ko?'거래소 원본 OHLC에 고정 왕복 비용을 차감한 모형입니다. 실제 체결·주문·세금·펀딩·레버리지는 포함하지 않습니다. 평균과 순이익 비율은 기록한 개별 사례 기준이며 복리·계좌 수익률·미래 적중 확률이 아닙니다. 같은 종목의 겹치는 관찰과 같은 신호의 중복 기록은 제한합니다. 직접 실행한 검색만 포함되어 시장 전체를 대표하지 않습니다.':'This model subtracts fixed round-trip costs from exchange OHLC outcomes. It excludes execution, orders, taxes, funding and leverage. Means and positive-outcome rates are per recorded case, not compounded account returns or future probabilities. Overlapping same-asset trials and duplicate signals are restricted. User-triggered scans are not a market-wide sample.'}</p><p>{ko?`이 브라우저에 현재 계정별로 최대 ${MAX_OPPORTUNITY_TRIALS}건 저장하며 서버 동기화하지 않습니다. 기록 화면을 열거나 ‘이후 가격 확인’을 누를 때 조회합니다. 조회 범위는 최근 120시간봉으로, 오래 열지 않아 필요한 봉이 범위를 벗어나면 판정할 수 없습니다. 손상·누락 사례를 성공으로 처리하거나 오래된 기록을 자동 삭제하지 않습니다. 브라우저 저장 삭제 전 기록을 내려받으세요.`:`Up to ${MAX_OPPORTUNITY_TRIALS} records per account in this browser, without server sync. History loads on visiting this view or refreshing. The latest 120 hourly bars are available; long gaps may make evaluation impossible. Missing cases are not counted as successes and old records are not silently deleted. Export before clearing browser storage.`}</p></details>
  </section>
}
