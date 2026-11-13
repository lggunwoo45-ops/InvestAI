import {useState} from 'react'
import {Link} from 'react-router-dom'
import {useLanguage} from '@/i18n/useLanguage'
import {useDisplayMode} from '@/app/displayMode/useDisplayMode'
import {useDocumentTitle} from '@/hooks/useDocumentTitle'
import {ProductStatus} from '@/components/product/ProductStatus'
import styles from '@/components/product/ProductExperience.module.css'

export function DemoPage() {
  const {language}=useLanguage(),ko=language==='ko',{displayMode,setDisplayMode}=useDisplayMode()
  const [topic,setTopic]=useState('start')
  useDocumentTitle(ko?'사용 가이드':'User guide')
  const questions=ko?[
    ['후보가 없으면 앱이 작동하지 않는 건가요?','아니요. 완료된 가격 기록과 진입 조건을 충족한 후보만 표시해요. 조건 미충족과 자료 부족은 다릅니다. 조건 미충족이면 카드의 재검토 가격을 확인하고, 자료 부족이면 연결 상태와 봉 누락 사유를 확인하세요.'],
    ['지지·저항·판단 무효화 가격은 무엇이 다른가요?','지지는 내려갈 때 매수세가 나타났던 가격, 저항은 올라갈 때 매도세가 나타났던 가격입니다. 판단 무효화 가격은 현재 분석의 전제를 다시 확인할 기준이에요. 하락 판단에서는 저항보다 위에 있을 수 있으며 지지선과 같은 뜻이 아닙니다. 어느 가격도 반등이나 체결을 보장하지 않아요.'],
    ['자료 없음·갱신 필요가 나오면 어떻게 하나요?','먼저 설정에서 실제 시세 모드인지 확인하고 연결 검사를 실행하세요. 조회 시각이 오래됐으면 다시 분석하고, 완료 봉이 부족하거나 원본에 공백이 있으면 다른 종목·시간대를 확인하세요. 자료가 회복되면 다시 분석할 수 있어요.'],
    ['창을 닫아도 기록과 알림이 동작하나요?','로그인 후 새로 등록한 추천 검증 기록은 서버가 이후 가격을 수집합니다. 비회원·이 기기 이전 기록은 화면을 열 때 갱신합니다. 브라우저 알림은 보이는 탭에서만 동작하고, 서버 감시·텔레그램은 별도로 등록·연결해야 해요. 아래 연결 상태에서 준비 여부를 확인하세요.'],
    ['가상 결과가 실제 수익률인가요?','아니요. 기록한 조건에 다음 정각의 실제 시가와 완료 시간봉을 적용한 모형입니다. 같은 봉에서 목표와 손절을 모두 만나면 범위로 표시하고, 누락 자료는 성공으로 계산하지 않아요. 실제 주문·체결·계좌 수익률과 다릅니다.'],
    ['로그인하면 이전 기록도 자동으로 옮겨지나요?','비회원 기록은 자동으로 계정에 합치지 않습니다. 계정 메뉴에서 가져오기를 선택하세요. 추천 검증의 이전 기기 기록은 별도 보기로 보존하고 서버에서 관찰한 이력으로 바꾸지 않아요. 이메일 복구가 준비되기 전까지는 가입 시 복구 코드를 안전하게 보관하세요.'],
  ]:[
    ['Does an empty shortlist mean the app is broken?','No. Unmet strategy conditions and insufficient data are different. Review the unmet conditions and reassessment prices, or inspect the connection and candle-gap explanation when evidence is missing.'],
    ['How do support, resistance and invalidation differ?','Support and resistance describe observed buying and selling areas. Invalidation is the price at which the current analysis needs reassessment. For a bearish view it can be above resistance; it is not another name for support. None guarantees a rebound or execution.'],
    ['What should I do with missing or stale data?','Check live mode and the connection in Settings. Refresh old analyses. If closed bars are insufficient or missing, inspect another asset or timeframe. You can retry when the source data recovers.'],
    ['Does monitoring continue when I close the app?','New signed-in opportunity records collect subsequent prices on the server. Guest and earlier device records update on visits. Browser alerts require a visible tab. Server rules and Telegram require separate registration and pairing.'],
    ['Are simulated results actual investment returns?','No. Frozen conditions are evaluated with the next hourly open and completed candles. Same-bar target/stop ambiguity is a range, and missing data is never counted as a win. This is not order execution or account performance.'],
    ['Does signing in import earlier records?','No automatic merge takes place. Use the account import action. Earlier device opportunity records remain separate from server observations. Retain your signup recovery code until email recovery is configured.'],
  ]
  const tasks=ko?[
    ['start','처음 시작해요','BTC 분석을 열고 지금 흐름 → 확인할 가격 → 주의할 조건 순서로 보세요. 처음에는 간편모드만으로 충분해요.','/my-analysis?instrumentId=upbit-btc','BTC 분석 열기'],
    ['record','후보와 결과를 기록해요','종목 찾기를 완료하고 ‘조건 충족 현물 전체 기록’을 누르세요. 로그인하면 서버에, 비회원이면 이 기기에 보관해요.','/ai-analysis','새 후보 찾기'],
    ['holding','이미 가진 종목을 봐요','평균 매수가와 수량을 입력하고 손익·가격 계획을 확인하세요. 이 입력으로 주문이 실행되지는 않아요.','/portfolio','내 종목 관리'],
  ]:[
    ['start','I am getting started','Open Bitcoin analysis. Read the trend, key prices and cautions in order. Simple mode is enough for a first review.','/my-analysis?instrumentId=upbit-btc','Open Bitcoin analysis'],
    ['record','I want to track outcomes','Complete a scan and record all eligible spot setups. Signed-in records go to the server; guest records stay on this device.','/ai-analysis','Find candidates'],
    ['holding','I already hold an asset','Enter your average price and quantity to review returns and price plans. Entering a holding does not place orders.','/portfolio','Manage holdings'],
  ]
  const task=tasks.find(t=>t[0]===topic)??tasks[0]
  return <div className={styles.page}>
    <header className={styles.hero}><div><span className={styles.eyebrow}>MARKET COPILOT / START HERE</span><h1>{ko?'하나의 종목부터,\n이해하고 기록하세요.':'Understand one asset.\nKeep a record.'}</h1><p>{ko?'처음에는 차트 지표를 모두 알 필요 없어요. 지금의 흐름, 판단이 바뀌는 가격, 이후 결과를 순서대로 확인하세요.':'Start with the trend, the prices that change the view, and what happens afterward. You do not need to master every indicator first.'}</p><div className={styles.actions}><Link className={styles.primary} to="/my-analysis?instrumentId=upbit-btc">{ko?'BTC 바로 분석하기':'Review Bitcoin now'} →</Link><Link to="/plans">{ko?'이용 범위·플랜':'Coverage and plans'}</Link></div></div><div className={styles.preview}><span>{ko?'나에게 맞는 화면':'Choose your view'}</span><h2>{ko?displayMode==='simple'?'지금은 간편모드예요':'지금은 전문가모드예요':displayMode==='simple'?'You are in Simple mode':'You are in Expert mode'}</h2><p>{ko?'간편모드는 지금 볼 결론과 가격을 먼저, 전문가모드는 시간대별 근거와 조건을 함께 보여줘요. 저장한 기록은 공통입니다.':'Simple mode leads with the current view and prices. Expert mode adds timeframe evidence and conditions. Both share your saved records.'}</p><button type="button" onClick={()=>setDisplayMode(displayMode==='simple'?'expert':'simple')}>{ko?displayMode==='simple'?'전문가모드로 보기':'간편모드로 보기':displayMode==='simple'?'Use Expert mode':'Use Simple mode'}</button></div></header>
    <section aria-labelledby="guide-task"><h2 id="guide-task">{ko?'지금 하려는 일부터 고르세요':'Start with your task'}</h2><div className={styles.actions} role="group" aria-label={ko?'사용 목적':'Your task'}>{tasks.map(t=><button type="button" key={t[0]} aria-pressed={t[0]===topic} onClick={()=>setTopic(t[0])}>{t[1]}</button>)}</div><ol className={styles.steps}><li><div><strong>{task[1]}</strong><p>{task[2]}</p><Link to={task[3]}>{task[4]} →</Link></div></li><li><div><strong>{ko?'근거와 자료 시각을 확인해요':'Check the evidence and its timestamp'}</strong><p>{ko?'가격 기준은 거래소·통화마다 달라요. 오래됐거나 빠진 자료가 있으면 먼저 다시 확인하세요.':'Price references differ by exchange and currency. Refresh stale data and check missing evidence before continuing.'}</p></div></li><li><div><strong>{ko?'기록을 남기고 다시 확인해요':'Save a record and revisit it'}</strong><p>{ko?'좋았던 결과뿐 아니라 미진입·손절·자료 부족도 함께 살펴보세요.':'Review skipped entries, stops and unavailable evidence alongside positive outcomes.'}</p><Link to="/results">{ko?'추천 검증 기록':'Forward review records'} →</Link></div></li></ol></section>
    <section aria-labelledby="guide-faq"><h2 id="guide-faq">{ko?'헷갈리는 부분을 풀어드릴게요':'Answers to common questions'}</h2><div className={styles.faq}>{questions.map(([title,answer])=><details key={title}><summary>{title}</summary><div><p>{answer}</p></div></details>)}</div></section>
    <ProductStatus language={language}/>
    <section className={styles.card}><h2>{ko?'연결 문제가 계속되나요?':'Still having connection problems?'}</h2><p>{ko?'설정에서 시세 연결을 검사하고, 기록이 있는 기기에서 먼저 내보내기로 백업하세요. 문의 접수 채널은 현재 준비 중입니다. 비밀번호·복구 코드·거래소 키는 공개 게시물에 넣지 마세요.':'Check market connectivity in Settings and export records from the device that holds them. A support intake channel is still being prepared. Never post passwords, recovery codes or exchange keys publicly.'}</p><div className={styles.actions}><Link to="/settings">{ko?'설정·연결 확인':'Settings and connections'}</Link><Link to="/portfolio">{ko?'내 기록·백업':'Holdings and backup'}</Link></div></section>
    <footer className={styles.footer}><Link to="/dashboard">{ko?'홈으로':'Home'}</Link><Link to="/plans">{ko?'무료 베타·유료 준비 현황':'Free beta and paid launch status'}</Link><span>{ko?'분석 보조 도구 · 자동 주문 없음':'Analysis support · no automatic orders'}</span></footer>
  </div>
}
