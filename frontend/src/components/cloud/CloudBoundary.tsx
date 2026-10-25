import { useEffect, type ReactNode } from 'react'
import { initializeCloud,syncCloud } from '@/services/cloud/cloudClient'
import { useCloud } from '@/services/cloud/useCloud'
export function CloudBoundary({children}:{children:ReactNode}){
  const state=useCloud()
  useEffect(()=>{void initializeCloud();const timer=setInterval(()=>{void syncCloud()},20_000);const focus=()=>{void syncCloud()};window.addEventListener('focus',focus);return()=>{clearInterval(timer);window.removeEventListener('focus',focus)}},[])
  useEffect(()=>{if(!state.pending)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault()};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[state.pending])
  if(state.loading)return <p role="status">회원 기록을 불러오고 있습니다…</p>
  return <div key={state.user?.id??'guest'} style={{display:'contents'}}>{children}</div>
}
