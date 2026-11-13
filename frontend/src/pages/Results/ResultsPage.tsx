import { productPageNames } from '@/app/navigation'
import { Link } from 'react-router-dom'
import { OpportunityTrialLedger } from '@/components/crypto-analysis/OpportunityTrialLedger'
import { useLanguage } from '@/i18n/useLanguage'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import styles from '@/components/product/ProductPages.module.css'

export function ResultsPage() {
  const { language } = useLanguage(), ko = language === 'ko'
  useDocumentTitle(productPageNames.results[language])
  return <div className={styles.page}>
    <header className={styles.heading}><span className={styles.eyebrow}>MARKET COPILOT · FOLLOW THE EVIDENCE</span><h1>{productPageNames.results[language]}</h1><p>{ko ? '기록한 후보가 이후 어떻게 됐는지 확인하세요. 좋은 결과와 실패·미진입·자료 부족을 함께 봅니다.' : 'See what happened to recorded candidates, including losses, skipped entries and missing evidence.'}</p></header>
    <nav className={styles.links} aria-label={ko ? '결과와 기록' : 'Results and records'}><Link to="/results" aria-current="page">{ko ? '후보 검증' : 'Forward results'}</Link><Link to="/research?mode=journal">{ko ? '내 검토 기록' : 'My review journal'}</Link><Link to="/review-alerts#server-monitor">{ko ? '가격 감시 기록' : 'Price observations'}</Link></nav>
    <OpportunityTrialLedger embedded />
    <p className={styles.count}>{ko ? '후보 검증은 고정 조건의 가상 결과입니다. 실제 계좌 손익과 구분하고, 기록에서 같은 종목의 현재 분석을 이어보세요.' : 'Forward results model frozen assumptions, separate from account returns. Open a record to review the same asset with current evidence.'}</p>
  </div>
}
