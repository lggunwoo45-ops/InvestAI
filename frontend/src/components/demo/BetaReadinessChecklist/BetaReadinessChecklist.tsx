import { useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import type { Language } from '@/i18n/translations'
import { cloudSnapshot, subscribeCloud } from '@/services/cloud/cloudClient'
import styles from './BetaReadinessChecklist.module.css'

export function BetaReadinessChecklist({language}:{language:Language}) {
  const cloud=useSyncExternalStore(subscribeCloud,cloudSnapshot),ko=language==='ko'
  const ready=cloud.enabled&&!cloud.expired&&!cloud.error
  const rows:[boolean,string,string][]=[
    [ready,ko?'회원 계정·관심종목·포트폴리오 저장':'Member accounts, watchlists and portfolios',ready?(ko?'로그인 후 기기 간 동기화':'Sync across devices after login'):(ko?'서버 연결 또는 로그인 확인 필요':'Check server connection and login')],
    [ready&&!!cloud.opportunityTrialsAvailable,ko?'추천 이후 가격 자동 관찰':'Automatic forward observation',ready&&cloud.opportunityTrialsAvailable?(ko?'새 계정 기록은 앱을 닫아도 수집':'New account records continue with the app closed'):(ko?'계정 서버 준비 확인 필요':'Account server readiness needs checking')],
    [ready&&!!cloud.emailAvailable,ko?'인증메일·이메일 비밀번호 복구':'Verification email and email recovery',ready&&cloud.emailAvailable?(ko?'메일 발송 설정 연결됨':'Email delivery configured'):(ko?'아직 준비 중 · 복구 코드 보관 필요':'Not configured · retain your recovery code')],
    [ready&&!!cloud.telegramAvailable,ko?'텔레그램 알림':'Telegram notifications',ready&&cloud.telegramAvailable?(ko?'계정에서 개인 알림 연결 필요':'Connect your personal destination in account settings'):(ko?'운영 서버의 알림 연결 준비 중':'Notification service not configured')],
    [false,ko?'유료 구독·결제':'Paid subscriptions and checkout',ko?'미제공 · 현재 무료 베타':'Unavailable · currently a free beta'],
    [false,ko?'자동 주문':'Automatic orders',ko?'미제공 · 분석·가상 검증만 제공':'Unavailable · analysis and simulated review only'],
  ]
  return <section className={styles.panel} aria-labelledby="beta-readiness"><header><span>INVESTAI BETA</span><h2 id="beta-readiness">{ko?'현재 이용 가능한 범위':'Current availability'}</h2></header><p>{ko?`접속 시 확인한 서버 설정입니다. ${cloud.signup&&ready?'신규 가입을 받고 있습니다.':'신규 가입 가능 여부는 계정에서 확인해주세요.'}${cloud.signupLimit?` 소규모 베타 가입 한도는 ${cloud.signupLimit}명입니다.`:''}`:'Server configuration checked on connection. Account availability may change during the limited beta.'}</p><ul>{rows.map(([available,title,detail])=><li key={title} data-status={available?'ready':'conditional'}><i aria-hidden="true"/><span><strong>{title}</strong><br/>{detail}</span><small>{available?(ko?'연결됨':'Configured'):(ko?'준비·확인 필요':'Pending')}</small></li>)}</ul><p><Link to="/settings">{ko?'계정·복구 코드 확인':'Review account and recovery options'}</Link> · <Link to="/results">{ko?'추천 검증 기록':'Forward review records'}</Link></p></section>
}
