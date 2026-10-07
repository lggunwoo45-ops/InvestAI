import type { Language } from '@/i18n/translations'
import type { AiCopilotFinalRead } from '@/services/aiCopilot/aiCopilotFinalRead'
import styles from './AiCopilotFinalReadCard.module.css'

interface AiCopilotFinalReadCardProps {
  result: AiCopilotFinalRead
  language: Language
}

const copy = {
  en: { eyebrow: 'AI Copilot final review', result: 'Final read', reason: 'Key reason', next: 'Next check', caution: 'Caution', confidence: 'Signal clarity', evidence: 'Reference evidence', sources: 'Source factors' },
  ko: { eyebrow: 'AI 코파일럿 최종 검토', result: '최종 검토 판단', reason: '핵심 이유', next: '다음 확인', caution: '주의', confidence: '판단 명확도', evidence: '참고 근거', sources: '사용 근거' },
} as const

export function AiCopilotFinalReadCard({ result, language }: AiCopilotFinalReadCardProps) {
  const t = copy[language]
  return <section className={styles.card} data-final-read={result.state} aria-label={language === 'ko' ? 'AI 코파일럿 최종 검토' : 'AI Copilot final review'}>
    <header>
      <div><span>{t.eyebrow}</span><small>{t.result}</small><h3>{result.title}</h3></div>
      <strong>{t.confidence}: {result.confidenceLabel}</strong>
    </header>
    <p className={styles.summary}>{result.summary}</p>
    <dl>
      <div><dt>{t.reason}</dt><dd>{result.why}</dd></div>
      <div><dt>{t.next}</dt><dd>{result.nextCheck}</dd></div>
      <div><dt>{t.caution}</dt><dd>{result.caution}</dd></div>
    </dl>
    {result.evidenceSummary.length > 0 && <div className={styles.evidence}><strong>{t.evidence}</strong><ul>{result.evidenceSummary.map((factor) => <li key={factor}>{factor}</li>)}</ul></div>}
    {result.sourceFactors.length > 0 && <p className={styles.sources}><span>{t.sources}</span>{result.sourceFactors.join(' · ')}</p>}
  </section>
}
