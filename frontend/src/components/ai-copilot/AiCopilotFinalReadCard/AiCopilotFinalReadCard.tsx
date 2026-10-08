import { useId, useState } from 'react'

import type { Language } from '@/i18n/translations'
import type { AiCopilotFinalRead } from '@/services/aiCopilot/aiCopilotFinalRead'
import styles from './AiCopilotFinalReadCard.module.css'

interface AiCopilotFinalReadCardProps {
  result: AiCopilotFinalRead
  language: Language
}

const copy = {
  en: { eyebrow: 'AI Copilot final review', result: 'Final read', whyState: 'Why this state', reason: 'Key reason', next: 'Next check', caution: 'Caution', confidence: 'Signal clarity', evidence: 'Evidence', sources: 'Source factors', showDetails: 'Show evidence details', hideDetails: 'Hide evidence details' },
  ko: { eyebrow: 'AI 코파일럿 최종 검토', result: '최종 검토 판단', whyState: '이 판단을 내린 이유', reason: '핵심 이유', next: '다음 확인', caution: '주의', confidence: '판단 명확도', evidence: '판단 근거', sources: '사용 근거', showDetails: '판단 근거 자세히 보기', hideDetails: '판단 근거 접기' },
} as const

export function AiCopilotFinalReadCard({ result, language }: AiCopilotFinalReadCardProps) {
  const t = copy[language]
  const [detailsVisible, setDetailsVisible] = useState(false)
  const detailsId = useId()
  return <section className={styles.card} data-final-read={result.state} aria-label={language === 'ko' ? 'AI 코파일럿 최종 검토' : 'AI Copilot final review'}>
    <header>
      <div><span>{t.eyebrow}</span><small>{t.result}</small><h3>{result.title}</h3></div>
      <strong>{t.confidence}: {result.confidenceLabel}</strong>
    </header>
    <div className={styles.stateReason}><strong>{t.whyState}</strong><p>{result.summary}</p></div>
    <dl>
      <div><dt>{t.reason}</dt><dd>{result.why}</dd></div>
      <div><dt>{t.next}</dt><dd>{result.nextCheck}</dd></div>
    </dl>
    {result.evidenceItems.length > 0 && <section className={styles.evidence} aria-label={t.evidence}>
      <strong>{t.evidence}</strong>
      {!detailsVisible && <div className={styles.evidenceGrid}>{result.evidenceItems.slice(0, 4).map((item) => <div key={item.key} data-evidence-status={item.status}><span>{item.label}</span><b>{item.value}</b><em>{item.statusLabel}</em></div>)}</div>}
      <button type="button" aria-expanded={detailsVisible} aria-controls={detailsId} onClick={() => setDetailsVisible((visible) => !visible)}>{detailsVisible ? t.hideDetails : t.showDetails}</button>
      {detailsVisible && <div id={detailsId} className={styles.details}>
        <ul>{result.evidenceItems.map((item) => <li key={item.key}><span>{item.label}</span><b>{item.value}</b><em data-evidence-status={item.status}>{item.statusLabel}</em></li>)}</ul>
        {result.sourceFactors.length > 0 && <p className={styles.sources}><span>{t.sources}</span>{result.sourceFactors.join(' · ')}</p>}
      </div>}
    </section>}
    <p className={styles.caution}><strong>{t.caution}</strong>{result.caution}</p>
  </section>
}
