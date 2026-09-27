import { Link } from 'react-router-dom'

import type { Language } from '@/i18n/translations'
import styles from './GettingStartedFlow.module.css'

interface GettingStartedFlowProps { language: Language }

const copy = {
  en: {
    eyebrow: 'MAIN BETA FLOW', title: 'Getting started',
    steps: ['Choose a market bucket in AI Analysis.', 'Review today’s 5 interest candidates.', 'Open a candidate in My Analysis.', 'Check the current read and review ranges.', 'If you already hold it, enter your recorded price.'],
    analysis: 'Go to AI Analysis', myAnalysis: 'My Analysis',
  },
  ko: {
    eyebrow: '주요 베타 흐름', title: '처음 사용 흐름',
    steps: ['AI 분석에서 시장군을 선택하세요.', '오늘의 관심 후보 5개를 확인하세요.', '후보를 눌러 내 종목 분석으로 이동하세요.', '지금 판단과 검토 범위를 확인하세요.', '보유 중이라면 내가 적은 참고 가격을 입력하세요.'],
    analysis: 'AI 분석으로 이동', myAnalysis: '내 종목 분석',
  },
} as const

export function GettingStartedFlow({ language }: GettingStartedFlowProps) {
  const t = copy[language]
  return <section className={styles.flow} aria-labelledby="beta-getting-started">
    <header><span>{t.eyebrow}</span><h2 id="beta-getting-started">{t.title}</h2></header>
    <ol>{t.steps.map((step, index) => <li key={step}><b>{index + 1}</b><span>{step}</span></li>)}</ol>
    <nav aria-label={t.title}><Link to="/ai-analysis">{t.analysis} →</Link><Link to="/my-analysis">{t.myAnalysis} →</Link></nav>
  </section>
}
