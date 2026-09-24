import type { Language } from '@/i18n/translations'
import type { MyAnalysisResult } from '@/types/myAnalysis'
import { deriveBeginnerInterestStage } from './beginnerInterestZoneModel'
import styles from './BeginnerInterestZone.module.css'

interface BeginnerInterestZoneProps {
  analysis: MyAnalysisResult
  language: Language
}

const copy = {
  en: {
    guide: 'Beginner guide', title: 'Interest stage', current: 'Current stage', meaning: 'Meaning', next: 'Next check', caution: 'Caution', safety: 'This is decision-support information, not a trade instruction.',
    stages: { waiting: 'Waiting / checking conditions', first: '1st interest zone', second: '2nd interest zone', third: '3rd interest zone', chaseCaution: 'Chase caution', reboundCaution: 'Sharp-drop rebound caution' },
    meanings: { waiting: 'More reliable evidence or clearer conditions are needed.', first: 'The asset has entered an initial observation stage, but the evidence remains incomplete.', second: 'Several review conditions are present, while confirmation is still required.', third: 'Live evidence is comparatively clear, but the stage remains an observation aid.', chaseCaution: 'Recent movement is already large, so avoid reacting to the stage as a command.', reboundCaution: 'A rebound after a sharp decline needs additional evidence.' },
  },
  ko: {
    guide: '초보자 가이드', title: '관심 단계', current: '현재 단계', meaning: '의미', next: '다음 확인', caution: '주의', safety: '거래 지시가 아니라 판단 보조 정보입니다.',
    stages: { waiting: '대기 / 조건 확인 중', first: '1차 관심구간', second: '2차 관심구간', third: '3차 관심구간', chaseCaution: '추격 접근 주의', reboundCaution: '급락 반등 주의' },
    meanings: { waiting: '더 신뢰할 수 있는 근거나 명확한 조건이 필요합니다.', first: '초기 관찰 단계에 들어왔지만 근거는 아직 충분하지 않습니다.', second: '여러 검토 조건이 확인됐지만 추가 확인이 필요합니다.', third: '실제 데이터 근거가 비교적 명확하지만 관찰을 돕는 단계일 뿐입니다.', chaseCaution: '최근 움직임이 이미 커서 현재 단계를 행동 지시처럼 해석하면 안 됩니다.', reboundCaution: '급락 후 반등에는 추가 근거 확인이 필요합니다.' },
  },
} as const

export function BeginnerInterestZone({ analysis, language }: BeginnerInterestZoneProps) {
  const t = copy[language]
  const stage = deriveBeginnerInterestStage(analysis)
  const next = analysis.reviewChecklist[0] ?? analysis.actionReadiness.nextChecks[0]
  const caution = analysis.actionReadiness.avoidConditions[0]

  return <section className={styles.card} data-stage={stage} aria-label={t.title}>
    <header><span>{t.guide}</span><h2>{t.title}</h2></header>
    <div className={styles.stage}><small>{t.current}</small><strong>{t.stages[stage]}</strong></div>
    <div className={styles.details}>
      <article><h3>{t.meaning}</h3><p>{t.meanings[stage]}</p></article>
      <article><h3>{t.next}</h3><p>{next}</p></article>
    </div>
    <footer><strong>{t.caution}</strong><span>{caution}</span><small>{t.safety}</small></footer>
  </section>
}
