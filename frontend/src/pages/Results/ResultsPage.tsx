import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { SimpleWorkspace } from '@/components/simple/SimpleWorkspace'
import { productPageNames } from '@/app/navigation'
import { Link } from 'react-router-dom'
import { OpportunityTrialLedger } from '@/components/crypto-analysis/OpportunityTrialLedger'
import { useLanguage } from '@/i18n/useLanguage'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import styles from '@/components/product/ProductPages.module.css'

export function ResultsPage() {
  const { language } = useLanguage(), ko = language === 'ko'
  const simple = useDisplayMode().displayMode === 'simple'
  useDocumentTitle(productPageNames.results[language])
  return <SimpleWorkspace enabled={simple} title={ko ? '저장한 후보, 그 뒤엔 어땠나요?' : 'What happened to your saved candidates?'} description={ko ? '결과를 확인하거나 메모·가격 알림으로 이어가세요.' : 'Check outcomes, then follow up with a note or a price alert.'}><div className={simple ? undefined : styles.page}>
    {!simple && <header className={styles.heading}><span className={styles.eyebrow}>MARKET COPILOT · FOLLOW THE EVIDENCE</span><h1>{productPageNames.results[language]}</h1><p>{ko ? '기록한 후보가 이후 어떻게 됐는지 확인하세요. 좋은 결과와 실패·미진입·자료 부족을 함께 봅니다.' : 'See what happened to recorded candidates, including losses, skipped entries and missing evidence.'}</p></header>}
    {!simple && <nav className={styles.links} aria-label={ko ? '결과와 기록' : 'Results and records'}><Link to="/results" aria-current="page">{ko ? '후보 검증' : 'Forward results'}</Link><Link to="/research?mode=journal">{ko ? '내 검토 기록' : 'My review journal'}</Link><Link to="/review-alerts#server-monitor">{ko ? '가격 감시 기록' : 'Price observations'}</Link></nav>}
    <OpportunityTrialLedger embedded />
    {!simple && <p className={styles.count}>{ko ? '후보 검증은 고정 조건의 가상 결과입니다. 실제 계좌 손익과 구분하고, 기록에서 같은 종목의 현재 분석을 이어보세요.' : 'Forward results model frozen assumptions, separate from account returns. Open a record to review the same asset with current evidence.'}</p>}
  </div></SimpleWorkspace>
}
