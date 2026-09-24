import type { Language } from '@/i18n/translations'
import type { DartDisclosureResult } from '@/types/dart'
import styles from './DartDisclosurePanel.module.css'

interface DartDisclosurePanelProps {
  compact?: boolean
  language: Language
  result: DartDisclosureResult
}

const copy = {
  en: {
    eyebrow: 'Disclosure evidence', title: 'Recent DART disclosures', report: 'Report', submitted: 'Submitted', type: 'Type', view: 'View disclosure', disabled: 'DART API key is not configured.', mapping: 'DART corporation code mapping is not available for this instrument.', unavailable: 'Disclosure data is unavailable.', loading: 'Loading disclosure evidence…', empty: 'No recent disclosures were returned.', evidence: 'Disclosure titles are shown as source evidence only.', safety: 'This is not investment advice or a trade instruction.', categories: { periodic: 'Periodic', material: 'Material', correction: 'Correction', other: 'Other' },
  },
  ko: {
    eyebrow: '공시 근거', title: '최근 DART 공시', report: '보고서', submitted: '제출일', type: '유형', view: '공시 보기', disabled: 'DART API 키가 설정되지 않았습니다.', mapping: '해당 종목의 DART 고유번호 매핑이 없습니다.', unavailable: '공시 데이터를 사용할 수 없습니다.', loading: '공시 근거를 불러오는 중…', empty: '최근 공시가 반환되지 않았습니다.', evidence: '공시 제목은 근거 자료로만 표시됩니다.', safety: '투자 조언이나 거래 지시가 아닙니다.', categories: { periodic: '정기', material: '주요사항', correction: '정정', other: '기타' },
  },
} as const

export function DartDisclosurePanel({ compact = false, language, result }: DartDisclosurePanelProps) {
  const t = copy[language]
  const limit = compact ? 2 : 5
  const stateMessage = result.status === 'disabled' ? t.disabled : result.status === 'mapping_unavailable' ? t.mapping : result.status === 'loading' ? t.loading : result.status === 'ready' && !result.disclosures.length ? t.empty : result.status === 'ready' ? null : t.unavailable

  return <section className={styles.panel} data-compact={compact} data-status={result.status} aria-label={t.title}>
    <header><div><span>{t.eyebrow}</span><h2>{t.title}</h2></div><b data-mode={result.sourceMode}>{result.sourceMode}</b></header>
    {stateMessage ? <p className={styles.state} role="status">{stateMessage}</p> : <div className={styles.list}>
      {result.disclosures.slice(0, limit).map((item) => <article key={item.id}>
        <div><small>{t.report}</small><strong>{item.reportName}</strong></div>
        <dl><div><dt>{t.submitted}</dt><dd>{item.submittedAt}</dd></div><div><dt>{t.type}</dt><dd><span data-category={item.disclosureType}>{t.categories[item.disclosureType]}</span></dd></div></dl>
        {item.detailUrl && <a href={item.detailUrl} target="_blank" rel="noreferrer">{t.view} ↗</a>}
      </article>)}
    </div>}
    <footer><span>{t.evidence}</span><small>{t.safety}</small></footer>
  </section>
}
