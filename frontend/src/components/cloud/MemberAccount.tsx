import { useEffect, useState, type FormEvent } from 'react'
import { acknowledgeRecovery,cloudRequest,conflictCopies,importGuestResearch,resolveCloudConflict,signIn,signOut,syncCloud,type TelegramStatus } from '@/services/cloud/cloudClient'
import { useCloud } from '@/services/cloud/useCloud'
import styles from './MemberAccount.module.css'

function download(name:string,value:unknown){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
export function MemberAccount(){
  const cloud=useCloud(),[open,setOpen]=useState(()=>!!cloud.recovery),[mode,setMode]=useState<'login'|'register'|'recover'>('login')
  const [username,setUsername]=useState(''),[password,setPassword]=useState(''),[recovery,setRecovery]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
  const [telegram,setTelegram]=useState<TelegramStatus|null>(null),[pair,setPair]=useState(''),[importing,setImporting]=useState(false)
  useEffect(()=>{
    if(!cloud.user||!open)return
    let alive=true
    const load=()=>{void cloudRequest<TelegramStatus>('/telegram').then(value=>{if(alive){setTelegram(value);if(value.connected)setPair('')}}).catch(()=>{})}
    load();const timer=setInterval(load,5000);return()=>{alive=false;clearInterval(timer)}
  },[cloud.user,open])
  if(!cloud.enabled)return null
  const act=async(work:()=>Promise<unknown>,success='')=>{setBusy(true);setError('');setMessage('');try{await work();setMessage(success)}catch(e){setError(e instanceof Error?e.message:'요청을 완료하지 못했습니다.')}finally{setBusy(false)}}
  const submit=(event:FormEvent)=>{event.preventDefault();void act(async()=>{await signIn(mode,{username,password,...(mode==='recover'?{recovery}:{})});setPassword('');setRecovery('')})}
  return <section className={styles.member} aria-label="회원 기록과 알림">
    <div className={styles.bar}><div><b>{cloud.user?`${cloud.user.username}의 연구 기록`:'다른 기기에서도 기록을 이어보세요'}</b><span>{cloud.user?(cloud.expired?'다시 로그인 필요':cloud.conflicts.length?'기록 충돌 확인 필요':cloud.pending?`전송 대기 ${cloud.pending}건`:cloud.syncing?'기록 동기화 중':'회원 기록 연결됨'):'계정으로 저장하고, 화면을 닫아도 가격 감시를 이어갑니다.'}</span></div><button onClick={()=>setOpen(!open)} aria-expanded={open}>{cloud.user?'계정·알림 설정':'로그인·가입'}</button></div>
    {(cloud.error||error)&&<p role="alert">{error||cloud.error}</p>}
    {open&&<div className={styles.content}>
      {!cloud.user||cloud.expired?<form onSubmit={submit} className={styles.form}>
        <h2>{mode==='register'?'InvestAI 계정 만들기':mode==='recover'?'복구 코드로 비밀번호 재설정':'내 기록으로 로그인'}</h2>
        <p>InvestAI 전용 아이디를 사용합니다. 이메일이나 거래소 로그인 정보는 필요하지 않습니다.</p>
        <label>아이디<input autoComplete="username" required pattern="[a-zA-Z0-9_-]{4,32}" minLength={4} maxLength={32} value={username} onChange={e=>setUsername(e.target.value)}/></label>
        <label>{mode==='recover'?'새 비밀번호':'비밀번호'}<input type="password" autoComplete={mode==='login'?'current-password':'new-password'} required minLength={15} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/><small>15자 이상. 기억하기 쉬운 긴 문장을 사용할 수 있어요.</small></label>
        {mode==='recover'&&<label>가입할 때 받은 복구 코드<input required autoComplete="off" value={recovery} onChange={e=>setRecovery(e.target.value)}/></label>}
        <button disabled={busy} type="submit">{busy?'확인 중…':mode==='register'?'계정 만들기':mode==='recover'?'비밀번호 재설정':'로그인'}</button>
        <div className={styles.actions}><button type="button" onClick={()=>setMode('login')}>로그인</button>{cloud.signup&&<button type="button" onClick={()=>setMode('register')}>처음 가입하기</button>}<button type="button" onClick={()=>setMode('recover')}>비밀번호를 잊었어요</button></div>
        {cloud.expired&&<button type="button" disabled={busy} onClick={()=>void act(()=>signOut())}>이 탭 로그아웃</button>}
      </form>:<>
        {cloud.recovery&&<aside className={styles.recovery} role="status"><h3>복구 코드를 안전한 곳에 보관하세요</h3><p>비밀번호를 잊었을 때 필요합니다. 닫으면 다시 표시되지 않으며, 비밀번호를 재설정하면 새 코드로 바뀝니다.</p><code>{cloud.recovery}</code><button onClick={()=>download('investai-recovery-code.json',{username:cloud.user!.username,recovery:cloud.recovery})}>복구 코드 내려받기</button><button onClick={acknowledgeRecovery}>보관했어요</button></aside>}
        <div className={styles.grid}><section><h3>내 기록</h3><p>연구실 검토·메모·신호 조합·브라우저 가격 조건을 이 계정으로 저장합니다. 기존 내 투자·관심종목 자료는 아직 이 기기에 남아 있습니다.</p><div className={styles.actions}><button disabled={busy||cloud.syncing} onClick={()=>void act(syncCloud)}>지금 동기화</button><button disabled={busy} onClick={()=>setImporting(!importing)}>기존 브라우저 기록 가져오기</button><button disabled={busy} onClick={()=>void act(async()=>download('investai-member-records.json',await cloudRequest('/export')))}>회원 기록 내려받기</button></div>{importing&&<div className={styles.confirm}><p>이 브라우저의 연구실 기록을 현재 계정의 서버 저장소로 복사합니다. 원본은 남겨두며, 겹치는 회원 메모는 덮어쓰지 않습니다.</p><button disabled={busy} onClick={()=>void act(async()=>{await importGuestResearch();setImporting(false)},'가져오기를 처리했습니다. 위의 동기화 상태도 확인해주세요.')}>이 계정으로 복사하기</button></div>}
          {cloud.conflicts.map(key=><div key={key} className={styles.confirm}><h4>{key.includes('draft')?'작성 중인 메모':'저장 기록'} 충돌</h4><p>두 기기에서 같은 기록을 수정했습니다. 두 버전을 내려받아 확인한 뒤 사용할 버전을 선택하세요.</p><button onClick={()=>download('investai-conflict.json',{key,...conflictCopies(key)})}>두 버전 내려받기</button><button disabled={busy} onClick={()=>void act(()=>resolveCloudConflict(key,'server'))}>서버 기록 사용</button><button disabled={busy} onClick={()=>void act(()=>resolveCloudConflict(key,'mine'))}>이 탭의 기록 사용</button></div>)}
        </section><section><h3>Telegram 알림</h3><p>{telegram?.connected?'내 Telegram이 연결되어 있습니다. 감시를 등록할 때 발송 여부를 선택하세요.':telegram?.available?'본인의 Telegram에서 시작 버튼을 누르면 연결됩니다.':'운영 서버의 봇 설정이 아직 없어 외부 발송을 사용할 수 없습니다. 서버 감지 기록은 앱에서 확인할 수 있습니다.'}</p>{telegram?.issue&&<p role="status">{telegram.issue}</p>}
          <div className={styles.actions}>{telegram?.available&&!telegram.connected&&<button disabled={busy} onClick={()=>void act(async()=>{const result=await cloudRequest<{url:string}>('/telegram/pair',{});setPair(result.url)})}>내 Telegram 연결</button>}{pair&&<a href={pair} target="_blank" rel="noreferrer">Telegram에서 시작하기 ↗</a>}{telegram?.connected&&<><button disabled={busy} onClick={()=>void act(()=>cloudRequest('/telegram/test',{}),'Telegram이 테스트 메시지를 접수했습니다. 실제 수신도 확인해주세요.')}>테스트 알림 보내기</button><button disabled={busy} onClick={()=>void act(async()=>setTelegram(await cloudRequest('/telegram/disconnect',{})))}>Telegram 연결 해제</button></>}</div>
        </section></div>
        <div className={styles.actions}><button disabled={busy} onClick={()=>void act(()=>signOut())}>이 탭 로그아웃</button><button disabled={busy} onClick={()=>void act(()=>signOut(true))}>모든 기기 로그아웃</button><small>로그아웃해도 등록한 서버 감시는 계속됩니다. 멈추려면 알림 화면에서 종료하세요.</small></div>
      </>}
      <p role="status">{message}</p>
    </div>}
  </section>
}
