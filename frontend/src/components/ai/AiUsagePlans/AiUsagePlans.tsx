import type { Language } from '@/i18n/translations'
import { aiTierPolicies } from '@/services/ai/aiTierPolicy'
import { listAiUsageEstimates } from '@/services/ai/aiUsageEstimator'
import type { AiFeatureAccess, AiFeatureKey, AiProductTier } from '@/types/aiProductTier'
import styles from './AiUsagePlans.module.css'

interface AiUsagePlansProps { language: Language }
const tiers: readonly AiProductTier[] = ['free', 'basic', 'pro']
const shownFeatures: readonly AiFeatureKey[] = ['marketRadar', 'cryptoWatchCandidates', 'candidatePlanningZones', 'localNotes', 'newsOriginal', 'newsInsight', 'aiNewsSummary', 'aiCandidateAnalysis', 'candidateReport', 'translationSummary', 'aiDeepDive', 'sectorWatchCandidates', 'portfolioAnalysis']

const text = {
  en: { eyebrow: 'COST CONTROL FOUNDATION', title: 'AI Usage & Plans', planning: 'Planning only', intro: 'Real AI is not connected yet. Rule-based features remain free; future AI features require explicit usage and cost controls.', noPayment: 'No payment is processed. Prices, credits, limits, and access are product-planning placeholders.', monthly: 'Monthly credits', daily: 'Daily limit', credits: 'Estimated credits', estimates: 'Future usage estimates', why: 'Why unlimited AI is not available', whyText: 'Model requests create variable cost and require evidence controls, caching, budgets, and server-side enforcement before release.', access: { available: 'Available', limited: 'Limited', locked: 'Locked', planned: 'Planned' }, features: { marketRadar: 'Market Radar', cryptoWatchCandidates: 'Rule-based watch candidates', candidatePlanningZones: 'Planning zones', localNotes: 'Local notes', newsOriginal: 'Original news', newsInsight: 'Rule-based News Insight', aiNewsSummary: 'AI news summary', aiCandidateAnalysis: 'AI candidate analysis', candidateReport: 'Candidate report', aiDeepDive: 'Deep dive', sectorWatchCandidates: 'Sector watch candidates', portfolioAnalysis: 'Portfolio analysis', translationSummary: 'Korean news summary', aiAlerts: 'AI alerts' }, cache: 'Cacheable', future: 'Future paid feature', radar: ['Market Radar', 'Hot sectors', 'Unusual volume', 'Volatility radar', 'Watch candidates'] },
  ko: { eyebrow: '비용 통제 기반', title: 'AI 사용량 및 플랜', planning: '계획 전용', intro: '실제 AI는 아직 연결되지 않았습니다. 규칙 기반 기능은 무료로 유지하며 향후 AI 기능에는 명시적인 사용량·비용 통제가 필요합니다.', noPayment: '결제는 처리되지 않습니다. 가격·크레딧·한도·접근 권한은 제품 계획용 예시입니다.', monthly: '월간 크레딧', daily: '일일 한도', credits: '예상 크레딧', estimates: '향후 사용량 예상', why: '무제한 AI 분석을 제공하지 않는 이유', whyText: '모델 요청은 변동 비용이 발생하므로 출시 전에 근거 통제, 캐시, 예산, 서버 측 한도가 필요합니다.', access: { available: '사용 가능', limited: '제한', locked: '잠김', planned: '예정' }, features: { marketRadar: '마켓 레이더', cryptoWatchCandidates: '규칙 기반 관찰 후보', candidatePlanningZones: '계획 구간', localNotes: '로컬 메모', newsOriginal: '원문 뉴스', newsInsight: '규칙 기반 뉴스 인사이트', aiNewsSummary: 'AI 뉴스 요약', aiCandidateAnalysis: 'AI 후보 분석', candidateReport: '후보 리포트', aiDeepDive: '심층 분석', sectorWatchCandidates: '섹터 관찰 후보', portfolioAnalysis: '포트폴리오 분석', translationSummary: '한국어 뉴스 요약', aiAlerts: 'AI 알림' }, cache: '캐시 가능', future: '향후 유료 기능', radar: ['마켓 레이더', '주목 섹터', '이상 거래량', '변동성 레이더', '관찰 후보'] },
} as const

const accessClass = (access: AiFeatureAccess) => `${styles.access} ${styles[access]}`

export function AiUsagePlans({ language }: AiUsagePlansProps) {
  const t = text[language]
  return <section className={styles.section} aria-labelledby="ai-usage-plans-title">
    <header className={styles.heading}><div><span>{t.eyebrow}</span><h2 id="ai-usage-plans-title">{t.title}</h2><p>{t.intro}</p></div><strong>{t.planning}</strong></header>
    <p className={styles.notice}>{t.noPayment}</p>
    <div className={styles.tiers}>{tiers.map((tier) => { const policy = aiTierPolicies[tier]; return <article key={tier} className={styles.tier}><header><div><span>{policy.label}</span><strong>{policy.monthlyPricePlaceholder}</strong></div><p>{policy.description}</p></header><dl><div><dt>{t.monthly}</dt><dd>{policy.monthlyCredits}</dd></div><div><dt>{t.daily}</dt><dd>{policy.dailySoftLimit}</dd></div></dl><ul>{shownFeatures.map((feature) => <li key={feature}><span>{t.features[feature]}</span><em className={accessClass(policy.features[feature])}>{t.access[policy.features[feature]]}</em></li>)}</ul><small>{policy.disclaimer}</small></article> })}</div>
    <section className={styles.estimates}><header><h3>{t.estimates}</h3><span>{t.future}</span></header><div>{listAiUsageEstimates().map((estimate) => <article key={estimate.requestType}><strong>{estimate.label}</strong><b>{estimate.estimatedCredits} {t.credits}</b><p>{estimate.notes}</p><small>{estimate.recommendedTier.toUpperCase()} · {estimate.cacheable ? t.cache : '—'}</small></article>)}</div></section>
    <aside className={styles.why}><strong>{t.why}</strong><p>{t.whyText}</p><div>{t.radar.map((item) => <span key={item}>{item}</span>)}</div></aside>
  </section>
}
