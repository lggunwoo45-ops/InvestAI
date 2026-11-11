import type {Language} from '@/i18n/translations'
import type {opportunityReport} from '@/services/cryptoAnalysis/opportunityReport'
import styles from './OpportunityTrialLedger.module.css'

export function OpportunityStrategyReport({strategies,language}:{strategies:ReturnType<typeof opportunityReport>['strategies'];language:Language}) {
  const ko=language==='ko'
  const names=ko?{pullback:'상승 추세 눌림',breakout:'가격 돌파',rebound:'하락 추세 속 반등'}:{pullback:'Trend pullback',breakout:'Price breakout',rebound:'Countertrend rebound'}
  const range=(a:number|null,b:number|null)=>a===null||b===null?'—':a===b?`${a.toFixed(2)}%`:`${a.toFixed(2)}% ~ ${b.toFixed(2)}%`
  return <details className={styles.comparison}><summary>{ko?'전략별 결과 비교':'Compare strategy outcomes'}</summary><p>{ko?'선택한 기간·거래시장에서 세 전략을 같은 기준으로 비교합니다. 전략 선택이나 아래 결과 상태 선택으로 이 비교의 표본을 줄이지 않습니다.':'Compare all three strategies for the selected recording period and market. Strategy and list-state selections do not narrow this comparison.'}</p><div className={styles.tableScroll} tabIndex={0} role="region" aria-label={ko?'전략별 결과 표 스크롤':'Scroll strategy comparison'}><table><caption>{ko?'기록한 사례의 가상 결과 · 수익률 순위가 아닙니다':'Simulated recorded outcomes · not a profitability ranking'}</caption><thead><tr>{(ko?['전략','기록','결과 계산','비용 차감 평균','진행','미진입','자료 부족']:['Strategy','Recorded','Evaluated','Mean after costs','Pending','Skipped','Unresolved']).map(t=><th scope="col" key={t}>{t}</th>)}</tr></thead><tbody>{strategies.map(({kind,summary:s})=><tr key={kind}><th scope="row">{names[kind]}</th><td>{s.total}</td><td>{s.completed}</td><td>{range(s.meanLow,s.meanHigh)}</td><td>{s.pending}</td><td>{s.skipped}</td><td>{s.unresolved}</td></tr>)}</tbody></table></div><p>{ko?'각 전략의 종목·시기·비용 가정이 다를 수 있습니다. 완료 표본이 적거나 자료가 빠졌다면 평균만으로 우열을 판단하기 어렵습니다.':'Assets, timing and cost assumptions may differ between strategies. Small samples and missing evidence limit comparisons.'}</p></details>
}
