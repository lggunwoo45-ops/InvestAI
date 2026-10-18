import { reviewPosition } from '@/services/portfolio/portfolioReview'
import type { Position } from '@/services/portfolio/portfolioStorage'
import { portfolioNumber, portfolioPercent } from '@/utils/formatPortfolio'
import styles from './PositionPlan.module.css'

const copy = {
  ko: { title: '내가 정한 투자 기준', target: '목표가', stop: '손절 기준가', reached: '기준 도달', waiting: '기준 도달 전', unknown: '시세 확인 필요', unset: '미설정', distance: '현재가 대비', outcome: '해당 가격에서 평가손익', breakEven: '본전까지 필요한 상승률', recovered: '평단가 이상', atCost: '평단가와 같음', notice: '직접 설정한 기준입니다. 조회 시세와 비교하며 자동 주문이나 알림은 실행하지 않습니다.', noPlan: '수정에서 목표가와 손절 기준을 설정할 수 있습니다.', average: '저장 평단가', quantity: '저장 수량', current: '조회가', loss: '평단가 아래', gain: '평단가 위' },
  en: { title: 'My investment criteria', target: 'Target price', stop: 'Stop reference price', reached: 'Threshold reached', waiting: 'Not reached', unknown: 'Quote needed', unset: 'Not set', distance: 'From current price', outcome: 'P/L at this price', breakEven: 'Rise needed to break even', recovered: 'At or above cost', atCost: 'At cost', notice: 'Your own criteria, compared with the fetched quote. No automatic orders or alerts.', noPlan: 'Use Edit to set a target and stop reference.', average: 'Saved average', quantity: 'Saved quantity', current: 'Fetched price', loss: 'Below average', gain: 'Above average' },
}

export function PositionPlan({ position, price, language, quoteLabel, showPosition = false }: {
  position: Position; price: number | null; language: 'ko' | 'en'; quoteLabel: string; showPosition?: boolean
}) {
  const t = copy[language]
  const review = reviewPosition(position, price)
  const amount = (value: number) => `${portfolioNumber(value)} ${position.quoteCurrency}`
  return <section className={styles.plan} aria-label={t.title}>
    <header><h3>{t.title}</h3><span>{quoteLabel}</span></header>
    {showPosition && <p>{t.average} {amount(position.averagePrice)} · {t.quantity} {portfolioNumber(position.quantity)}</p>}
    <div className={styles.basis}>
      <span>{t.current}<strong>{review.current && price !== null ? amount(price) : '—'}</strong></span>
      <span>{review.breakEvenChange === null || review.breakEvenChange > 0 ? t.breakEven : t.recovered}<strong>{review.breakEvenChange === null ? '—' : review.breakEvenChange > 0 ? portfolioPercent(review.breakEvenChange) : review.breakEvenChange === 0 ? t.atCost : t.gain}</strong></span>
    </div>
    <div className={styles.levels}>{(['target', 'stop'] as const).map(kind => {
      const level = review[kind]
      return <div key={kind} className={styles.level} data-reached={level?.reached ? kind : undefined}>
        <div className={styles.levelHeading}><span>{t[kind]}</span><b>{level ? amount(level.price) : t.unset}</b></div>
        {level && <>
          <strong className={styles.status}>{level.reached === null ? t.unknown : level.reached ? t.reached : t.waiting}</strong>
          <dl><div><dt>{t.distance}</dt><dd>{level.distance === null ? '—' : portfolioPercent(level.distance)}</dd></div>
            <div><dt>{t.outcome}</dt><dd>{level.atLevel ? `${amount(level.atLevel.profit)} (${portfolioPercent(level.atLevel.percent)})` : '—'}</dd></div></dl>
        </>}
      </div>
    })}</div>
    {!review.target && !review.stop && <p>{t.noPlan}</p>}
    <small>{t.notice}</small>
  </section>
}
