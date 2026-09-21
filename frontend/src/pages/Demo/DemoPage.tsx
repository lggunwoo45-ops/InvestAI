import { Link } from 'react-router-dom'

import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { DisplayModeNotice } from '@/components/displayMode/DisplayModeNotice/DisplayModeNotice'
import { BetaScopeBanner } from '@/components/demo/BetaScopeBanner/BetaScopeBanner'
import { DemoHealthChecklist } from '@/components/demo/DemoHealthChecklist/DemoHealthChecklist'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useLanguage } from '@/i18n/useLanguage'
import { uiText } from '@/i18n/translations'
import { getDemoScopeSummary } from '@/services/demo/demoScopeConfig'
import styles from './DemoPage.module.css'

const copy = {
  en: {
    eyebrow: 'INVESTOR DEMO', subtitle: 'AI-ready market decision-support platform', rule: 'Rule-based now, AI-ready later', crypto: 'Crypto workflow available', stock: 'Stock workflow early beta', ai: 'Real AI planned, not connected', works: 'What works now', flow: 'Demo flow', show: 'What to show', say: 'What to say', roadmap: 'Product roadmap', trust: 'Trust boundary', quick: 'Demo quick links', next: 'Next milestone', limits: 'Limitations', open: 'Open step',
    quickLinks: [
      { label: 'Open Market Radar', route: '/dashboard' },
      { label: 'Open Watch Candidates', route: '/ai-analysis' },
      { label: 'Open Korea Stock Candidates', route: '/ai-analysis', hint: 'Select the Korea Stocks tab' },
      { label: 'Open US Stock Candidates', route: '/ai-analysis', hint: 'Select the US Stocks tab' },
      { label: 'Open News Center', route: '/news' },
      { label: 'Open AI Usage Plans', route: '/ai-analysis#ai-usage-plans-title' },
    ],
    roadmapItems: ['1.5 Beta · Current demo scope', '1.6 · Stock data expansion', '1.7 · AI summary pilot', '1.8 · Paid Sector Picks UI', '2.0 · AI-assisted full beta'],
    statuses: { available: 'Available', beta: 'Beta', limited: 'Limited', planned: 'Planned', locked: 'Locked', notAvailable: 'Not available' },
  },
  ko: {
    eyebrow: '투자자 데모', subtitle: 'AI-ready 시장 의사결정 지원 플랫폼', rule: '현재는 규칙 기반, 향후 AI-ready', crypto: '가상자산 흐름 사용 가능', stock: '주식 흐름 초기 베타', ai: '실제 AI 예정 · 미연결', works: '현재 작동하는 기능', flow: '데모 흐름', show: '보여줄 내용', say: '설명할 내용', roadmap: '제품 로드맵', trust: '신뢰 경계', quick: '데모 빠른 이동', next: '다음 단계', limits: '제한사항', open: '단계 열기',
    quickLinks: [
      { label: 'Market Radar 열기', route: '/dashboard' },
      { label: '관찰 후보 열기', route: '/ai-analysis' },
      { label: '한국 주식 후보 열기', route: '/ai-analysis', hint: '한국 주식 탭을 선택하세요' },
      { label: '미국 주식 후보 열기', route: '/ai-analysis', hint: '미국 주식 탭을 선택하세요' },
      { label: '뉴스 센터 열기', route: '/news' },
      { label: 'AI 사용량 및 플랜 열기', route: '/ai-analysis#ai-usage-plans-title' },
    ],
    roadmapItems: ['1.5 Beta · 현재 데모 범위', '1.6 · 주식 데이터 확장', '1.7 · AI 요약 파일럿', '1.8 · 유료 Sector Picks UI', '2.0 · AI 지원 전체 베타'],
    statuses: { available: '사용 가능', beta: '베타', limited: '제한', planned: '예정', locked: '잠김', notAvailable: '사용 불가' },
  },
} as const

const readinessCopy = {
  en: {
    title: '1.5 Beta Readiness', ready: 'Ready for demo', validation: 'Needs validation', deferred: 'Deferred',
    readyItems: ['Market Radar', 'Crypto Watch Candidates', 'Short / Swing / Long horizons', 'Planning zones', 'News Insight', 'AI Usage & Plans', 'Korea / US Stock candidate beta tabs'],
    validationItems: ['Candidate score usefulness', 'Stock data quality', 'Investor feedback', 'News insight clarity', 'Pricing and credit assumptions'],
    deferredItems: ['Real AI', 'Real stock provider', 'Production news backend', 'Payment and subscription', 'Trading and order execution', 'User accounts'],
    scriptTitle: '5-minute investor demo script', presenterNotes: 'Presenter notes',
    script: [
      ['Open Market Radar', 'Start with the daily market-awareness view and explain the deterministic evidence cards.'],
      ['Review Crypto Watch Candidates', 'Show the shortlist as research support, never as a buy or sell instruction.'],
      ['Compare planning horizons', 'Explain how Short, Swing, and Long views separate time horizons without predicting returns.'],
      ['Inspect planning zones', 'Present zones as rule-based review references, not executable orders.'],
      ['Connect News Insight', 'Show which normalized evidence supports context while retaining source transparency.'],
      ['Preview stock candidate beta', 'Open Korea and US tabs and state that stock coverage is intentionally early beta.'],
      ['Close with AI Usage & Plans', 'Explain that real AI is planned behind explicit usage and cost controls.'],
    ],
    notes: ['Market Copilot supports decisions; it does not execute trades.', 'Crypto is the most validated workflow in this beta.', 'Stock coverage is intentionally an early beta.', 'Real AI is planned behind usage and cost controls.'],
    limitationsTitle: 'Known limitations',
    limitations: ['No real AI model is connected.', 'Stock data is mock or limited.', 'No real stock provider is connected.', 'No accounts, payment, or subscriptions.', 'No trading or order execution.', 'No cloud sharing or production backend.', 'News translation is not implemented.'],
    questionsTitle: 'Investor feedback questions',
    questions: ['Is the candidate logic understandable?', 'Does horizon separation support your review process?', 'Are planning zones clear without feeling like trade instructions?', 'Is Market Radar useful as a first screen?', 'Are News Insight evidence links clear enough to trust?', 'Is the stock early-beta direction valuable?', 'Which AI-assisted features would users pay for?', 'Do the usage and credit assumptions feel understandable?', 'What data quality is required before you would use this regularly?'],
    guidanceTitle: 'What not to say', avoidTitle: 'Do not present as', presentTitle: 'Present as',
    avoid: ['A completed trading platform', 'A guaranteed profit system', 'An AI stock picker', 'An auto-trading system'],
    present: ['A decision-support beta', 'An AI-ready architecture', 'A crypto-first validated workflow', 'An intentionally early stock beta'],
    noTelemetry: 'No submission, telemetry, or backend',
  },
  ko: {
    title: '1.5 베타 준비 상태', ready: '데모 준비 완료', validation: '검증 필요', deferred: '추후 구현',
    readyItems: ['Market Radar', '가상자산 관찰 후보', '단기 / 스윙 / 장기 기간 구분', '계획 구간', '뉴스 인사이트', 'AI 사용량 및 플랜', '한국 / 미국 주식 후보 베타 탭'],
    validationItems: ['후보 점수의 유용성', '주식 데이터 품질', '투자자 피드백', '뉴스 인사이트 명확성', '가격·크레딧 가정'],
    deferredItems: ['실제 AI', '실제 주식 공급자', '운영용 뉴스 백엔드', '결제·구독', '거래·주문 실행', '사용자 계정'],
    scriptTitle: '5분 투자자 데모 스크립트', presenterNotes: '발표자 메모',
    script: [
      ['Market Radar 열기', '결정론적 근거 카드로 구성된 일일 시장 인지 화면부터 설명합니다.'],
      ['가상자산 관찰 후보 검토', '매수·매도 지시가 아닌 조사 지원 목록이라는 점을 보여줍니다.'],
      ['계획 기간 비교', '수익 예측 없이 단기·스윙·장기 관점을 구분하는 방식을 설명합니다.'],
      ['계획 구간 확인', '실행 주문이 아닌 규칙 기반 검토 기준으로 소개합니다.'],
      ['뉴스 인사이트 연결', '출처 투명성을 유지하면서 정규화된 근거가 맥락을 보강하는 방식을 보여줍니다.'],
      ['주식 후보 베타 미리보기', '한국·미국 탭을 열고 주식 범위가 의도적인 초기 베타임을 밝힙니다.'],
      ['AI 사용량 및 플랜으로 마무리', '실제 AI는 명확한 사용량·비용 통제 뒤에 연결될 예정임을 설명합니다.'],
    ],
    notes: ['Market Copilot은 의사결정을 지원하며 거래를 실행하지 않습니다.', '이번 베타에서 가상자산 흐름이 가장 많이 검증되었습니다.', '주식 범위는 의도적인 초기 베타입니다.', '실제 AI는 사용량·비용 통제 뒤에 연결될 예정입니다.'],
    limitationsTitle: '알려진 제한사항',
    limitations: ['실제 AI 모델은 연결되지 않았습니다.', '주식 데이터는 모의 또는 제한 데이터입니다.', '실제 주식 공급자는 연결되지 않았습니다.', '계정·결제·구독 기능이 없습니다.', '거래·주문 실행 기능이 없습니다.', '클라우드 공유 및 운영 백엔드가 없습니다.', '뉴스 번역은 구현되지 않았습니다.'],
    questionsTitle: '투자자 피드백 질문',
    questions: ['후보 로직을 이해할 수 있습니까?', '기간 구분이 검토 과정에 도움이 됩니까?', '계획 구간이 거래 지시처럼 보이지 않으면서 명확합니까?', 'Market Radar가 첫 화면으로 유용합니까?', '뉴스 인사이트의 근거 연결을 신뢰할 만큼 명확합니까?', '주식 초기 베타 방향이 가치 있습니까?', '어떤 AI 지원 기능에 비용을 지불하시겠습니까?', '사용량과 크레딧 가정이 이해하기 쉽습니까?', '정기적으로 사용하려면 어느 수준의 데이터 품질이 필요합니까?'],
    guidanceTitle: '말하지 말아야 할 표현', avoidTitle: '다음과 같이 소개하지 않기', presentTitle: '다음과 같이 소개하기',
    avoid: ['완성된 트레이딩 플랫폼', '수익 보장 시스템', 'AI 종목 추천기', '자동매매 시스템'],
    present: ['의사결정 지원 베타', 'AI-ready 아키텍처', '가상자산 우선 검증 흐름', '의도적인 주식 초기 베타'],
    noTelemetry: '제출·텔레메트리·백엔드 없음',
  },
} as const

export function DemoPage() {
  const { language } = useLanguage()
  const { displayMode } = useDisplayMode()
  const scope = getDemoScopeSummary(language)
  const t = copy[language]
  const p = readinessCopy[language]
  useDocumentTitle(scope.versionLabel)

  return <div className={styles.page}>
    <BetaScopeBanner language={language} />
    {displayMode === 'simple' && <DisplayModeNotice>{uiText[language].displayMode.demoHint}</DisplayModeNotice>}
    <header className={styles.hero}><span>{t.eyebrow}</span><h1>{scope.versionLabel}</h1><h2>{t.subtitle}</h2><p>{scope.positioning}</p><div><b>{t.crypto}</b><b>{t.stock}</b><b>{t.ai}</b><b>{t.rule}</b></div></header>
    <nav className={styles.quick} aria-label={t.quick}><span>{t.quick}</span>{t.quickLinks.map((link) => <Link key={link.label} to={link.route}><strong>{link.label} →</strong>{'hint' in link && <small>{link.hint}</small>}</Link>)}</nav>

    <section className={`${styles.section} ${styles.readiness}`} aria-labelledby="demo-readiness"><header><span>01</span><h2 id="demo-readiness">{p.title}</h2></header><div className={styles.readinessGrid}><article data-tone="ready"><h3>{p.ready}</h3><ul>{p.readyItems.map((item) => <li key={item}>{item}</li>)}</ul></article><article data-tone="validate"><h3>{p.validation}</h3><ul>{p.validationItems.map((item) => <li key={item}>{item}</li>)}</ul></article><article data-tone="deferred"><h3>{p.deferred}</h3><ul>{p.deferredItems.map((item) => <li key={item}>{item}</li>)}</ul></article></div></section>

    <section className={styles.section} aria-labelledby="demo-works"><header><span>02</span><h2 id="demo-works">{t.works}</h2></header><div className={styles.capabilities}>{scope.capabilities.map((capability) => <article key={capability.area} data-status={capability.status}><header><h3>{capability.title}</h3><em>{t.statuses[capability.status]}</em></header><p>{capability.summary}</p><ul>{capability.whatWorks.map((item) => <li key={item}>{item}</li>)}</ul><details><summary>{t.limits}</summary><ul>{capability.limitations.map((item) => <li key={item}>{item}</li>)}</ul><small>{t.next}: {capability.nextMilestone}</small></details></article>)}</div></section>

    <section className={styles.section} aria-labelledby="demo-script"><header><span>03</span><h2 id="demo-script">{p.scriptTitle}</h2></header><ol className={styles.script}>{p.script.map(([title, note], index) => <li key={title}><b>{String(index + 1).padStart(2, '0')}</b><div><h3>{title}</h3><p>{note}</p></div></li>)}</ol><aside className={styles.presenter}><h3>{p.presenterNotes}</h3><ul>{p.notes.map((note) => <li key={note}>{note}</li>)}</ul></aside></section>

    <DemoHealthChecklist language={language} />

    <section className={styles.section} aria-labelledby="demo-flow"><header><span>04</span><h2 id="demo-flow">{t.flow}</h2></header><ol className={styles.flow}>{scope.demoFlow.map((step, index) => <li key={step.id}><b>{String(index + 1).padStart(2, '0')}</b><div><header><h3>{step.title}</h3><em>{t.statuses[step.status]}</em></header><p><span>{t.show}</span>{step.summary}</p><p><span>{t.say}</span>{step.talkingPoints.join(' · ')}</p><Link to={step.route}>{t.open} →</Link></div></li>)}</ol></section>

    <section className={styles.split}><article aria-labelledby="demo-roadmap"><span>05</span><h2 id="demo-roadmap">{t.roadmap}</h2><ol>{t.roadmapItems.map((item) => <li key={item}>{item}</li>)}</ol><small>{language === 'ko' ? '표시된 버전은 제품 방향이며 확정 일정이 아닙니다.' : 'Version labels show product direction, not committed dates.'}</small></article><article aria-labelledby="demo-trust"><span>06</span><h2 id="demo-trust">{t.trust}</h2><ul>{scope.trustBoundaries.map((item) => <li key={item}>{item}</li>)}</ul></article><article aria-labelledby="demo-limitations"><span>07</span><h2 id="demo-limitations">{p.limitationsTitle}</h2><ul>{p.limitations.map((item) => <li key={item}>{item}</li>)}</ul></article><article aria-labelledby="demo-questions"><span>08</span><h2 id="demo-questions">{p.questionsTitle}</h2><ul>{p.questions.map((item) => <li key={item}>□ {item}</li>)}</ul><small>{p.noTelemetry}</small></article></section>

    <section className={`${styles.section} ${styles.guidance}`} aria-labelledby="demo-guidance"><header><span>09</span><h2 id="demo-guidance">{p.guidanceTitle}</h2></header><div><article data-guidance="avoid"><h3>{p.avoidTitle}</h3><ul>{p.avoid.map((item) => <li key={item}>{item}</li>)}</ul></article><article data-guidance="present"><h3>{p.presentTitle}</h3><ul>{p.present.map((item) => <li key={item}>{item}</li>)}</ul></article></div></section>
  </div>
}
