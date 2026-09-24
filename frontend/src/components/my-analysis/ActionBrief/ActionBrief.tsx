import type { Language } from '@/i18n/translations'
import type { MyAnalysisResult } from '@/types/myAnalysis'
import styles from './ActionBrief.module.css'

interface ActionBriefProps {
  analysis: MyAnalysisResult
  language: Language
  mode: 'simple' | 'expert'
}

const copy = {
  en: {
    eyebrow: 'Action brief', current: 'Current state', meaning: 'What it means', why: 'Why it appears', next: 'What to check next', weaken: 'What would weaken this view', data: 'Data confidence', guide: 'How to read action status', ruleHint: 'See rule basis below.', loaded: 'Loaded evidence', missing: 'Missing evidence',
    dataLabels: { live: 'Live data', mock: 'Mock/demo data', limited: 'Limited data', unavailable: 'Data unavailable' },
    dataDetails: { live: 'Status is based on currently loaded public market data. This is not sufficient for investment advice.', mock: 'This is a workflow preview. The result shows how analysis will be organized when reliable data is connected.', limited: 'Action status is conservative because key data is missing.', unavailable: 'Action status is conservative because key data is missing.' },
    dataTags: { live: 'Loaded public data', mock: 'Workflow preview only', limited: 'Conservative status', unavailable: 'Conservative status' },
    guideItems: [
      ['Decision pending', 'Data is not reliable enough yet.'],
      ['Waiting / checking conditions', 'More conditions need confirmation before the state becomes clearer.'],
      ['Watch zone', 'Worth monitoring while review conditions remain incomplete.'],
      ['Conditional approach possible', 'Some conditions exist, but confirmation is still needed.'],
      ['Movement expansion caution', 'Recent movement is already large.'],
      ['Sharp-drop rebound caution', 'A rebound after a sharp drop needs more evidence.'],
    ],
  },
  ko: {
    eyebrow: '액션 브리핑', current: '현재 상태', meaning: '의미', why: '왜 표시되나요?', next: '다음 확인 항목', weaken: '약해지는 조건', data: '데이터 신뢰 상태', guide: '액션 상태 읽는 법', ruleHint: '아래 규칙 근거를 확인하세요.', loaded: '불러온 근거', missing: '부족한 근거',
    dataLabels: { live: '실제 데이터', mock: '모의/데모 데이터', limited: '제한 데이터', unavailable: '데이터 이용 불가' },
    dataDetails: { live: '현재 불러온 공개 시장 데이터를 기준으로 표시됩니다. 투자 조언에 충분하다는 의미는 아닙니다.', mock: '흐름 미리보기입니다. 신뢰 가능한 데이터가 연결되면 분석이 어떻게 정리되는지 보여줍니다.', limited: '핵심 데이터가 부족해 보수적으로 표시됩니다.', unavailable: '핵심 데이터가 부족해 보수적으로 표시됩니다.' },
    dataTags: { live: '공개 데이터 불러옴', mock: '흐름 미리보기용', limited: '보수적 상태', unavailable: '보수적 상태' },
    guideItems: [
      ['판단 보류', '데이터 신뢰도가 부족합니다.'],
      ['대기 / 조건 확인 중', '추가 조건 확인이 필요합니다.'],
      ['관심 구간', '계속 볼 만한 상태입니다.'],
      ['조건부 접근 가능', '일부 조건은 있지만 추가 확인이 필요합니다.'],
      ['변동 확대 주의', '이미 움직임이 큰 상태입니다.'],
      ['급락 반등 접근 주의', '급락 후 반등은 추가 근거가 필요합니다.'],
    ],
  },
} as const

export function ActionBrief({ analysis, language, mode }: ActionBriefProps) {
  const t = copy[language]
  const plan = analysis.actionReadiness
  const quality = analysis.dataQuality

  return <section className={styles.brief} data-mode={mode} data-status={plan.status} aria-label={t.eyebrow}>
    <header>
      <div><span>{t.eyebrow} · {t.current}</span><h2>{plan.title}</h2></div>
      <div className={styles.dataState} data-quality={quality}><strong>{t.dataLabels[quality]}</strong><small>{t.dataTags[quality]}</small></div>
    </header>
    <div className={styles.summaryGrid}>
      <article><h3>{t.meaning}</h3><p>{plan.summary}</p></article>
      <article><h3>{t.why}</h3><p>{plan.whyThisStatus}</p></article>
      <article><h3>{t.next}</h3><p>{plan.nextChecks[0]}</p></article>
      <article><h3>{t.weaken}</h3><p>{plan.avoidConditions[0]}</p></article>
      <article className={styles.confidence}><h3>{t.data}</h3><p>{t.dataDetails[quality]}</p><small>{t.loaded}: {analysis.evidence.length} · {t.missing}: {analysis.missingEvidence.length}</small></article>
    </div>
    {mode === 'expert' && <p className={styles.ruleHint}>{t.ruleHint}</p>}
    <details className={styles.guide}>
      <summary>{t.guide}</summary>
      <dl>{t.guideItems.map(([status, meaning]) => <div key={status}><dt>{status}</dt><dd>{meaning}</dd></div>)}</dl>
    </details>
  </section>
}
