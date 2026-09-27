import type { Language } from '@/i18n/translations'
import type { DartDisclosureResult } from '@/types/dart'
import styles from './DartDisclosurePanel.module.css'

interface DartDisclosurePanelProps {
  compact?: boolean
  id?: string
  language: Language
  result: DartDisclosureResult
}

const copy = {
  en: {
    eyebrow: 'Disclosure evidence', title: 'Recent DART disclosures', report: 'Report', submitted: 'Submitted', type: 'Type', view: 'View disclosure', disabled: 'DART API key is not configured, so disclosures could not be loaded. The app still works, but disclosure evidence is not shown. Configure the key in the optional server proxy to enable it.', mapping: 'This instrument does not yet have a DART corporation-code mapping. The rest of the analysis still works; disclosure coverage is limited for this instrument.', unavailable: 'The optional local DART proxy is unavailable. The rest of the analysis still works, but Korean disclosure evidence is limited. Start or configure the proxy, then try again.', loading: 'Loading disclosure evidence…', empty: 'No recent disclosures were loaded. The analysis still works; verify disclosures directly if they are important to your review.', evidence: 'Disclosure titles are shown as source evidence only.', safety: 'This is not investment advice or a trade instruction.', categories: { periodic: 'Periodic', material: 'Material', correction: 'Correction', other: 'Other' },
  },
  ko: {
    eyebrow: '공시 근거', title: '최근 DART 공시', report: '보고서', submitted: '제출일', type: '유형', view: '공시 보기', disabled: 'DART API 키가 없어 공시를 불러오지 못했습니다. 앱 기능은 계속 사용할 수 있지만, 공시 근거는 표시되지 않습니다. 사용하려면 선택형 서버 프록시에 키를 설정하세요.', mapping: '이 종목은 아직 DART 고유번호 매핑이 없습니다. 나머지 분석은 계속 작동하지만 이 종목의 공시 범위는 제한됩니다.', unavailable: '선택형 로컬 DART 프록시를 사용할 수 없습니다. 나머지 분석은 계속 작동하지만 한국 주식 공시 근거는 제한됩니다. 프록시를 시작하거나 설정한 뒤 다시 시도하세요.', loading: '공시 근거를 불러오는 중…', empty: '조회된 최근 공시가 없습니다. 분석은 계속 작동하며, 공시가 중요한 경우 원문을 직접 확인하세요.', evidence: '공시 제목은 근거 자료로만 표시됩니다.', safety: '투자 조언이나 거래 지시가 아닙니다.', categories: { periodic: '정기', material: '주요사항', correction: '정정', other: '기타' },
  },
} as const

export function DartDisclosurePanel({ compact = false, id, language, result }: DartDisclosurePanelProps) {
  const t = copy[language]
  const limit = compact ? 2 : 5
  const stateMessage = result.status === 'disabled' ? t.disabled : result.status === 'mapping_unavailable' ? t.mapping : result.status === 'loading' ? t.loading : result.status === 'ready' && !result.disclosures.length ? t.empty : result.status === 'ready' ? null : t.unavailable

  return <section id={id} className={styles.panel} data-compact={compact} data-status={result.status} aria-label={t.title}>
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
