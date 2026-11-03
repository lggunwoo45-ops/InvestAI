import {useState} from 'react'
import {cloudRequest} from '@/services/cloud/cloudClient'
import {useCloud} from '@/services/cloud/useCloud'
import type {Language} from '@/i18n/translations'
import styles from './ProductExperience.module.css'

interface Availability {enabled:boolean;emailAvailable?:boolean;telegramAvailable?:boolean;opportunityTrialsAvailable?:boolean}
export function ProductStatus({language}:{language:Language}) {
  const cloud=useCloud(),ko=language==='ko'
  const [checked,setChecked]=useState<{status:Availability;at:number}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(false)
  const status=checked?.status??cloud,healthy=status.enabled&&!error&&(checked!==null||!cloud.error)
  const check=async()=>{setBusy(true);setError(false);try{const next=await cloudRequest<Availability>('/status');if(typeof next?.enabled!=='boolean')throw Error('status');setChecked({status:next,at:Date.now()})}catch{setError(true)}finally{setBusy(false)}}
  const rows=[
    [healthy,ko?'회원 기록 저장':'Account storage',ko?'로그인 후 관심종목·보유 기록을 기기 간 동기화':'Sync watchlists and holdings after login'],
    [healthy&&status.opportunityTrialsAvailable===true,ko?'추천 이후 가격 관찰':'Forward price observation',ko?'새 회원 기록은 화면을 닫아도 서버에서 수집':'New member records collect prices with the app closed'],
    [healthy&&status.emailAvailable===true,ko?'이메일 인증·복구':'Email verification and recovery',ko?'미연결 시 가입할 때 받은 복구 코드를 보관하세요':'When unavailable, retain the recovery code issued at signup'],
    [healthy&&status.telegramAvailable===true,ko?'텔레그램 전달':'Telegram delivery',ko?'서버 준비 후 개인 계정의 연결·수신 확인이 필요해요':'Requires personal pairing and a delivery check after setup'],
  ] as const
  return <section aria-labelledby="product-availability"><div className={styles.sectionHead}><div><h2 id="product-availability">{ko?'지금 연결된 기능':'Connected services'}</h2><p>{error?(ko?'새 상태를 확인하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도하세요.':'Status could not be checked. Check your connection and retry.'):checked?(ko?`확인 시각 ${new Date(checked.at).toLocaleString('ko-KR')}`:`Checked ${new Date(checked.at).toLocaleString('en-US')}`):(ko?'접속 시 확인한 서버 설정입니다. 발송 성공이나 투자 성과를 뜻하지 않습니다.':'Server configuration on connection, not a delivery or performance guarantee.')}</p></div><button type="button" disabled={busy} onClick={()=>void check()}>{ko?busy?'확인 중…':'연결 상태 다시 확인':busy?'Checking…':'Check connections'}</button></div><div className={styles.statusGrid}>{rows.map(([ready,title,detail])=><article key={title} data-ready={!!ready}><strong>{title} · {ko?ready?'설정 연결됨':error?'확인 필요':'준비 중':ready?'Configured':error?'Check required':'Pending'}</strong><span>{detail}</span></article>)}</div></section>
}
