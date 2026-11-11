import {useId} from 'react'
import type {Language} from '@/i18n/translations'
import {TRIAL_HOUR, type OpportunityTrial, type TrialOutcome} from '@/services/cryptoAnalysis/opportunityTrials'
import {formatAnalysisPrice} from '@/utils/formatAnalysisPrice'
import styles from './OpportunityTrialLedger.module.css'

export function OpportunityEvidenceChart({trial,outcome,asOf,language}:{trial:OpportunityTrial;outcome:TrialOutcome;asOf:number;language:Language}) {
  const ko=language==='ko', id=useId()
  const bars=trial.evidence.filter(c=>c.timestamp+TRIAL_HOUR<=asOf).slice(0,outcome.bars || (outcome.state==='skipped'?1:24))
  if(!bars.length) return <p>{ko?'아직 표시할 완료 시간봉이 없습니다. 이후 가격이 수집되면 차트가 나타납니다.':'No completed hourly bars yet. The chart appears when subsequent prices are collected.'}</p>
  if(trial.issue==='revised') return <p>{ko?'원본과 저장 가격이 달라 가격 차트와 결과 판정을 보류했습니다.':'The source conflicts with stored prices. Chart and outcome are withheld.'}</p>
  const low=Math.min(trial.stop,...bars.map(b=>b.low)),high=Math.max(trial.target,...bars.map(b=>b.high))
  const pad=Math.max((high-low)*.09,high*.0001),min=low-pad,max=high+pad
  const x=(i:number)=>20+(i+.5)*480/bars.length,y=(v:number)=>18+(max-v)/(max-min)*164
  const tick=(v:number)=>formatAnalysisPrice(v,language)
  const time=(at:number)=>new Date(at).toLocaleString(ko?'ko-KR':'en-US',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false})
  return <figure className={styles.evidence}>
    <figcaption id={id}>{ko?'기록 이후 실제 시간봉':'Observed hourly candles'} · {trial.instrument.quoteCurrency}</figcaption>
    <div className={styles.chartLegend}><span>{ko?'목표':'Target'} <b>{tick(trial.target)}</b></span><span>{ko?'손절':'Stop'} <b>{tick(trial.stop)}</b></span></div>
    <svg viewBox="0 0 520 200" role="img" aria-labelledby={id} aria-describedby={`${id}-description`}>
      <desc id={`${id}-description`}>{ko?`완료 봉 ${bars.length}개. 고정 진입 구간 ${tick(trial.entry[0])}~${tick(trial.entry[1])}, 손절 ${tick(trial.stop)}, 목표 ${tick(trial.target)}. 자세한 값은 아래 표에서 확인하세요.`:`${bars.length} completed candles with frozen entry zone, stop and target. Exact values are available in the table below.`}</desc>
      <rect x="20" y={y(trial.entry[1])} width="480" height={Math.max(1,y(trial.entry[0])-y(trial.entry[1]))} fill="var(--color-accent)" opacity=".09"/>
      {[trial.target,trial.stop].map(value=><line key={value} x1="20" x2="500" y1={y(value)} y2={y(value)} stroke="currentColor" strokeDasharray="5 4" opacity=".5"/>)}
      {bars.map((bar,i)=>{const rising=bar.close>=bar.open,color=rising?'var(--color-positive)':'var(--color-negative)',top=y(Math.max(bar.open,bar.close)),height=Math.max(1.5,Math.abs(y(bar.open)-y(bar.close)));return <g key={bar.timestamp}><line x1={x(i)} x2={x(i)} y1={y(bar.high)} y2={y(bar.low)} stroke={color}/><rect x={x(i)-Math.min(6,150/bars.length)} y={top} width={Math.min(12,300/bars.length)} height={height} fill={color}/></g>})}
      <line x1="20" x2="500" y1="193" y2="193" stroke="currentColor" opacity=".2"/>
    </svg>
    <div className={styles.chartTimes}><span>{time(bars[0].timestamp)}</span><span>{time(bars[bars.length-1].timestamp+TRIAL_HOUR)}</span></div>
    <p>{ko?'음영은 고정 진입 구간, 점선은 목표·손절입니다. 봉 안의 체결 순서는 알 수 없습니다. 아래 시각은 이 기기의 시간대입니다.':'Shading marks the frozen entry zone; dashed lines mark target and stop. Intrabar execution order is unknown. Times use this device’s timezone.'}</p>
    <details><summary>{ko?'시간별 원본 가격 표':'Hourly price table'}</summary><div className={styles.tableScroll} tabIndex={0} role="region" aria-label={ko?'시간별 가격 표 스크롤':'Scroll hourly prices'}><table><caption>{ko?'확보된 완료 시간봉 · 가격 단위 ':'Completed hourly candles · '}{trial.instrument.quoteCurrency}</caption><thead><tr>{(ko?['시작 시각','시가','고가','저가','종가']:['Open time','Open','High','Low','Close']).map(t=><th scope="col" key={t}>{t}</th>)}</tr></thead><tbody>{bars.map(b=><tr key={b.timestamp}><th scope="row">{time(b.timestamp)}</th>{[b.open,b.high,b.low,b.close].map((v,i)=><td key={i}>{tick(v)}</td>)}</tr>)}</tbody></table></div></details>
  </figure>
}
