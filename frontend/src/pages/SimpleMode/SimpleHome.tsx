import {Link} from 'react-router-dom'
import {LiveCandidateSearch} from '@/components/ai-analysis/LiveCandidateSearch'
import {SimpleFeatureLinks} from '@/components/simple/SimpleWorkspace'
import {FirstReview} from '@/components/product/FirstReview'
import {useLanguage} from '@/i18n/useLanguage'
import {useDocumentTitle} from '@/hooks/useDocumentTitle'
import styles from '@/components/product/ProductExperience.module.css'

export function SimpleHome() {
  const {language}=useLanguage(),ko=language==='ko'
  useDocumentTitle(ko?'추천 · 쉽게 보기':'Candidates · Simple')
  return <div className={styles.page}>
    <FirstReview language={language}/>
    <section><div className={styles.searchHeading}><h2>{ko?'다른 기회도 찾아볼까요?':'Explore other opportunities'}</h2><Link to="/ai-analysis#opportunity-records">{ko?'내 검증 기록':'My forward records'} →</Link></div><p>{ko?'거래가 활발한 종목에서 상승 눌림·돌파·하락 속 반등을 따로 검사해요.':'Check active assets for pullbacks, breakouts and countertrend rebounds.'}</p><LiveCandidateSearch/></section>
    <nav className={styles.actions} aria-label={ko?'내 투자 이어보기':'Continue your research'}><Link to="/portfolio">{ko?'내 종목 확인':'My holdings'} →</Link><Link to="/research?mode=alerts">{ko?'가격 알림':'Price alerts'} →</Link><Link to="/plans">{ko?'이용 플랜':'Plans'} →</Link></nav>
    <details><summary>{ko?'다른 도구와 사용 가이드':'More tools and guidance'}</summary><SimpleFeatureLinks/></details>
  </div>
}
