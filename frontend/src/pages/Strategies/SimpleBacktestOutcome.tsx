import type { BacktestResult } from '@/services/cryptoAnalysis/strategyLab'
import type { Language } from '@/i18n/translations'
import styles from '@/pages/Settings/SettingsPage.module.css'

export function SimpleBacktestOutcome({ result, currency, language }: { result: BacktestResult; currency: string; language: Language }) {
  const ko = language === 'ko'
  const money = (value: number) => `${value.toLocaleString(language, { maximumFractionDigits: currency === 'KRW' ? 0 : 8 })} ${currency}`
  const hold = result.starting * (1 + result.buyHoldPercent / 100)
  const difference = result.equity - hold
  return <section aria-label={ko ? '과거 시험 핵심 결과' : 'Historical test at a glance'}>
    <p>{ko ? `시작 금액 ${money(result.starting)}` : `Starting with ${money(result.starting)}`}</p>
    <div className={styles.result}>
      <span>{ko ? '이 규칙을 따랐을 때 남은 금액' : 'Ending balance with this rule'}</span><strong>{money(result.equity)}</strong>
      <span>{ko ? '같은 기간 계속 보유했다면' : 'Simply holding for the same period'}: {money(hold)}</span>
    </div>
    <p><strong>{ko ? difference > 0 ? `계속 보유한 것보다 ${money(difference)} 더 남았어요.` : difference < 0 ? `계속 보유한 것보다 ${money(-difference)} 덜 남았어요.` : '두 방법의 결과가 같아요.' : difference > 0 ? `${money(difference)} more than holding.` : difference < 0 ? `${money(-difference)} less than holding.` : 'Both methods had the same outcome.'}</strong></p>
    {result.returnPercent < 0 && <p>{ko ? '이 규칙의 결과도 시작 금액보다 줄었어요.' : 'This rule still ended below the starting balance.'}</p>}
    <p>{ko ? `도중에 가장 많이 줄어든 폭은 ${result.drawdownPercent.toFixed(2)}%예요. 일봉 마감 가격 기준이라 하루 안의 급락은 더 클 수 있어요.` : `The largest decline from a prior peak was ${result.drawdownPercent.toFixed(2)}% at daily closes. Intraday losses can be larger.`}</p>
    <small>{new Date(result.from).toLocaleDateString(language)} – {new Date(result.to).toLocaleDateString(language)} · {ko ? '거래 비용 반영 · 과거 모의 결과' : 'After costs · historical simulation'}</small>
    <details><summary>{ko ? '수익률과 거래 횟수' : 'Returns and trade count'}</summary><p>{ko ? '이 규칙' : 'This rule'} {result.returnPercent.toFixed(2)}% · {ko ? '계속 보유' : 'Holding'} {result.buyHoldPercent.toFixed(2)}% · {ko ? '완료 거래' : 'Closed trades'} {result.trades.length}</p></details>
  </section>
}
