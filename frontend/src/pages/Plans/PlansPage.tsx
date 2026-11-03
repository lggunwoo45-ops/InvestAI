import {Link} from 'react-router-dom'
import {useLanguage} from '@/i18n/useLanguage'
import {useDocumentTitle} from '@/hooks/useDocumentTitle'
import {AiUsagePlans} from '@/components/ai/AiUsagePlans/AiUsagePlans'
import {ProductStatus} from '@/components/product/ProductStatus'
import styles from '@/components/product/ProductExperience.module.css'

export function PlansPage() {
  const {language}=useLanguage(),ko=language==='ko'
  useDocumentTitle(ko?'이용 플랜':'Plans')
  return <div className={styles.page}><header><span className={styles.eyebrow}>INVESTAI / PLANS</span><h1>{ko?'무엇을 쓸 수 있는지,\n먼저 명확하게.':'Know what is available\nbefore you start.'}</h1><p>{ko?'분석을 경험하고 기록을 쌓는 무료 베타를 운영하고 있어요. 실제 제공 중인 기능과 준비 중인 기능을 구분해 안내합니다.':'Try analysis and build a research record in the free beta. Available services and future plans are shown separately.'}</p></header><AiUsagePlans language={language}/><ProductStatus language={language}/><section className={styles.note}><strong>{ko?'결제 전에 반드시 안내할 내용':'What will be clear before checkout'}</strong><p>{ko?'판매자·문의처, 확정 가격과 제공 범위, 결제 주기, 해지·환불 조건을 먼저 공개할 예정입니다. 지금은 결제를 받지 않으며, 과거 결과나 유료 이용이 수익을 보장하지 않습니다.':'Seller and support details, confirmed pricing and coverage, billing frequency, and cancellation/refund terms will be published before payments open. No payment is accepted now. Past outcomes and paid access do not guarantee returns.'}</p></section><footer className={styles.footer}><Link to="/demo">{ko?'사용 가이드':'User guide'}</Link><Link to="/ai-analysis">{ko?'종목 찾기':'Find candidates'}</Link><Link to="/settings">{ko?'설정':'Settings'}</Link></footer></div>
}
