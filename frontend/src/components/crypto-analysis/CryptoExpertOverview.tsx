import type { Language } from '@/i18n/translations'
import type { CryptoDecision } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import { formatAnalysisPrice } from '@/utils/formatAnalysisPrice'
import styles from './CryptoExpertOverview.module.css'

/** Uses the engine's validated, completed candles; it never opens another data subscription. */
export function CryptoExpertOverview({ decision, language, quoteCurrency }: { decision: CryptoDecision; language: Language; quoteCurrency: string }) {
  const ko = language === 'ko'
  const frame = decision.frames.find(row => row.frame === decision.plan?.frame && !row.issue) ?? decision.frames.find(row => !row.issue)
  const candles = frame?.candles.slice(-60) ?? []
  const closes = candles.map(candle => candle.close)
  const low = Math.min(...closes), high = Math.max(...closes)
  const spread = high - low || Math.max(high * .01, 1)
  const line = closes.map((close, index) => `${index === 0 ? 'M' : 'L'}${(index / Math.max(1, closes.length - 1) * 600).toFixed(2)},${(164 - (close - low) / spread * 148).toFixed(2)}`).join(' ')
  const number = (value: number | null) => value === null ? '—' : formatAnalysisPrice(value, language)
  const date = (value: number) => new Date(value).toLocaleString(ko ? 'ko-KR' : 'en-US', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' })
  const names = ko ? { '1H':'1시간', '4H':'4시간', '1D':'일봉' } : { '1H':'1 hour', '4H':'4 hours', '1D':'Daily' }
  const direction = ko ? { buy:'상승', sell:'하락', neutral:'혼재' } : { buy:'Up', sell:'Down', neutral:'Mixed' }
  const issues = ko ? { loading:'준비 중', mock:'예시 자료', disconnected:'연결 확인', stale:'갱신 지연', history:'기록 부족', gaps:'기록 누락', range:'변동 폭 부족' } : { loading:'Loading', mock:'Example data', disconnected:'Disconnected', stale:'Stale', history:'Short history', gaps:'History gaps', range:'Range unavailable' }

  return <section className={styles.overview} aria-label={ko ? '전문가 분석 작업공간' : 'Expert analysis workspace'}>
    <figure className={styles.chart}>
      <figcaption>{frame ? `${names[frame.frame]} · ` : ''}{ko ? '완료 봉 종가 흐름' : 'Completed candle closes'}</figcaption>
      {candles.length > 1 ? <>
        <div className={styles.scale}><span>{ko ? '표시 구간 최고' : 'Displayed high'} {number(high)} {quoteCurrency}</span><span>{ko ? '최저' : 'Low'} {number(low)} {quoteCurrency}</span></div>
        <svg viewBox="0 0 600 180" preserveAspectRatio="none" role="img" aria-label={`${ko ? '확인된 종가' : 'Verified closes'} · ${names[frame!.frame]} · ${candles.length} ${ko ? '개 봉' : 'candles'}`}>
          <path d="M0 16H600 M0 90H600 M0 164H600" className={styles.grid} vectorEffect="non-scaling-stroke" />
          <path d={line} className={styles.line} vectorEffect="non-scaling-stroke" />
        </svg>
        <div className={styles.scale}><span>{date(candles[0].timestamp)}</span><span>{date(candles.at(-1)!.timestamp)}</span></div>
        <small>{ko ? '완료된 봉의 종가만 표시합니다. 진행 중인 봉과 현재가는 제외합니다.' : 'Completed closes only. The active candle and live quote are excluded.'}</small>
      </> : <p>{ko ? '유효한 가격 기록이 준비되면 차트를 표시해요.' : 'The chart appears when valid price history is ready.'}</p>}
    </figure>
    <div className={styles.indicators}>
      <h3>{ko ? '시간대별 지표 비교' : 'Compare timeframe indicators'}</h3>
      <div className={styles.tableWrap}><table><thead><tr><th>{ko ? '시간대' : 'Frame'}</th><th>{ko ? '흐름' : 'Trend'}</th><th>RSI 14</th><th>{ko ? '거래량' : 'Volume'}</th></tr></thead><tbody>
        {decision.frames.map(row => <tr key={row.frame}><th scope="row">{names[row.frame]}</th><td>{row.issue ? issues[row.issue] : direction[row.direction]}</td><td>{row.issue ? '—' : row.rsi?.toFixed(1) ?? '—'}</td><td>{!row.issue && row.volumeRatio !== null ? `${row.volumeRatio.toFixed(2)}×` : '—'}</td></tr>)}
      </tbody></table></div>
      <p>{ko ? '거래량은 직전 20개 완료 봉 평균 대비입니다.' : 'Volume relative to the preceding 20 completed candles.'}</p>
      <dl><div><dt>{ko ? '가격 계획 기준' : 'Price plan frame'}</dt><dd>{decision.plan ? names[decision.plan.frame] : '—'}</dd></div><div><dt>{ko ? '손익비' : 'Reward / risk'}</dt><dd>{decision.plan ? `${decision.plan.rewardRisk.toFixed(2)} : 1` : '—'}</dd></div><div><dt>{ko ? '마지막 완료 봉' : 'Last completed candle'}</dt><dd>{frame?.asOf ? date(frame.asOf) : '—'}</dd></div></dl>
    </div>
  </section>
}
