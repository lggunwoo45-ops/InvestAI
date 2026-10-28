import { researchBase } from '@/services/research/researchClient'
import { investmentRecordLimits } from '../../../../backend/cloud/recordPolicy.mjs'
import { ETF_KEY, validEtfLedger, type EtfLedger } from '../../../../backend/research/etfLedger.mjs'

export interface Member { id:string; username:string; email?:string|null; emailVerifiedAt?:number|null }
export interface CloudRecord { key:string; value:string|null; version:number }
export interface TelegramStatus { available:boolean; connected:boolean; issue:string|null; linkedAt:number|null }
interface Pending { value:string|null; version:number }
export interface CloudState { enabled:boolean; signup:boolean; emailAvailable?:boolean; loading:boolean; user:Member|null; error:string; syncing:boolean; pending:number; conflicts:string[]; revision:number; recovery:string; expired:boolean }
let state:CloudState={enabled:false,signup:false,loading:false,user:null,error:'',syncing:false,pending:0,conflicts:[],revision:0,recovery:'',expired:false}
let token='',generation=0,initialized=false,records=new Map<string,CloudRecord>(),pending=new Map<string,Pending>(),sending=false
const listeners=new Set<()=>void>()
let syncTimer:ReturnType<typeof setTimeout>|undefined
function scheduleSync(){clearTimeout(syncTimer);syncTimer=setTimeout(()=>{void syncCloud()},400)}
const publish=(patch:Partial<CloudState>)=>{state={...state,...patch,pending:pending.size};listeners.forEach(fn=>fn())}
export const cloudSnapshot=()=>state
export const subscribeCloud=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn)}}
// Keep the member context during reauthentication; never switch requests to the PC's separate vault on expiry.
export const cloudSignedIn=()=>!!state.user
export const acknowledgeRecovery=()=>publish({recovery:''})
export function cloudBase(){return researchBase().replace(/\/api\/research$/,'/api/cloud')}
export class CloudRequestError extends Error { status:number; constructor(status:number,message:string){super(message);this.status=status} }
export async function cloudRequest<T>(path:string,data?:unknown,method=data===undefined?'GET':'POST',requestToken=token):Promise<T>{
  const response=await fetch(cloudBase()+path,{method,credentials:'omit',redirect:'error',signal:AbortSignal.timeout(35_000),headers:{'accept':'application/json',...(requestToken?{authorization:`Bearer ${requestToken}`} : {}),...(data===undefined?{}:{'content-type':'application/json','x-investai-cloud':'1','x-investai-monitor':'1'})},body:data===undefined?undefined:JSON.stringify(data)})
  if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('회원 서버가 연결되지 않았습니다.')
  const result=await response.json()
  if(!response.ok){if(response.status===401&&requestToken&&requestToken===token&&!['/login','/register','/recover'].includes(path))publish({expired:true,error:'로그인이 만료되었습니다. 계정 설정에서 다시 로그인해주세요.'});throw new CloudRequestError(response.status,result.error??'요청을 완료하지 못했습니다.')}
  return result as T
}
function cache(){
  if(!state.user)return
  try{sessionStorage.setItem(`investai.cloud.pending.${state.user.id}`,JSON.stringify([...pending]))}catch{publish({error:'동기화 전 메모를 임시 보관하지 못했습니다. 이 탭을 닫기 전에 동기화를 완료해주세요.'})}
}
export const CLOUD_RECORDS_CHANGED='investai-cloud-records'
export const notifyCloudRecords=()=>window.dispatchEvent(new Event(CLOUD_RECORDS_CHANGED))
const remoteChanged=notifyCloudRecords
function applyRemote(rows:CloudRecord[]){
  let changed=false
  for(const row of rows){if(!pending.has(row.key)&&records.get(row.key)?.value!==row.value)changed=true;records.set(row.key,row)}
  if(changed){publish({revision:state.revision+1});remoteChanged()}
}
export async function initializeCloud(){
  if(initialized)return
  initialized=true
  try{
    const status=await cloudRequest<{enabled:boolean;signup:boolean;emailAvailable?:boolean;error?:string}>('/status')
    publish({enabled:status.enabled,signup:status.signup,emailAvailable:status.emailAvailable===true})
    const saved=sessionStorage.getItem('investai.cloud.session')
    if(status.enabled&&saved){
      const parsed=JSON.parse(saved);if(typeof parsed.token!=='string')return
      token=parsed.token;publish({loading:true})
      try{const me=await cloudRequest<{user:Member;records:CloudRecord[]}>('/me');await acceptSession(me.user,me.records)}
      catch{token='';sessionStorage.removeItem('investai.cloud.session');publish({user:null,error:'로그인이 만료되었거나 서버에 연결하지 못했습니다. 다시 로그인하면 미전송 기록을 복구합니다.'})}
      finally{publish({loading:false})}
    }
  }catch(error){
    // An absent optional endpoint leaves guest mode intact; an explicitly unhealthy member server stays visible.
    if(error instanceof CloudRequestError&&error.status===503)publish({enabled:true,error:error.message})
  }
}
async function acceptSession(user:Member,rows:CloudRecord[],recovery=''){
  generation++;records=new Map(rows.map(row=>[row.key,row]));pending=new Map()
  try{const saved=JSON.parse(sessionStorage.getItem(`investai.cloud.pending.${user.id}`)??'[]');if(Array.isArray(saved))pending=new Map(saved)}catch{/* Preserve the server copy on an unreadable cache. */}
  publish({user,error:'',conflicts:[],revision:state.revision+1,recovery,expired:false});remoteChanged();void syncCloud()
}
export async function signIn(mode:'login'|'register'|'recover',input:{username:string;password:string;recovery?:string;emailTicket?:string}){
  const result=await cloudRequest<{token:string;user:Member;recovery?:string}>('/'+mode,input)
  // Read the new account before switching the global identity. In-flight writes still belong to the old token.
  const me=await cloudRequest<{records:CloudRecord[]}>('/me',undefined,'GET',result.token)
  generation++
  token=result.token
  try{sessionStorage.setItem('investai.cloud.session',JSON.stringify({token}))}catch{/* An in-memory session remains usable until the tab closes. */}
  await acceptSession(result.user,me.records,result.recovery)
  return result.recovery
}
export async function refreshMember(){
  const current=generation
  const me=await cloudRequest<{user:Member}>('/me')
  if(current===generation)publish({user:me.user})
}
export async function signOut(all=false){
  await syncCloud()
  if(pending.size)throw new Error('전송하지 못한 기록이 있습니다. 충돌을 확인하거나 동기화한 뒤 로그아웃해주세요.')
  if(!state.expired||all)await cloudRequest('/logout',{all})
  generation++;token='';sessionStorage.removeItem('investai.cloud.session');records.clear();pending.clear();publish({user:null,conflicts:[],error:'',revision:state.revision+1,recovery:'',expired:false});remoteChanged()
}
export async function syncCloud(){
  clearTimeout(syncTimer)
  if(sending||!state.user||state.expired)return
  sending=true;const current=generation;let completed=false;publish({syncing:true,error:''})
  try{
    for(const [key,job] of [...pending]){
      if(current!==generation)return
      if(state.conflicts.includes(key))continue
      try{
        const result=await cloudRequest<CloudRecord>('/records',{key,...job},'PUT')
        if(current!==generation)return
        records.set(key,result)
        if(pending.get(key)===job)pending.delete(key)
        else {const newer=pending.get(key);if(newer)newer.version=result.version}
        cache()
      }catch(e){if(current!==generation)return;if(e instanceof CloudRequestError&&e.status===409){publish({conflicts:[...new Set([...state.conflicts,key])],error:'다른 기기에서 수정한 기록과 충돌했습니다. 계정에서 확인해주세요.'});continue}throw e}
    }
    const latest=await cloudRequest<{records:CloudRecord[]}>('/records')
    if(current===generation)applyRemote(latest.records)
    completed=true
  }catch(e){if(current===generation)publish({error:e instanceof Error?e.message:'동기화하지 못했습니다. 입력은 이 탭에 남아 있습니다.'})}
  finally{sending=false;publish({syncing:false});cache();if((completed||current!==generation)&&[...pending.keys()].some(key=>!state.conflicts.includes(key)))scheduleSync()}
}
export async function resolveCloudConflict(key:string,choice:'server'|'mine'){
  const current=generation
  const latest=await cloudRequest<{records:CloudRecord[]}>('/records'),remote=latest.records.find(r=>r.key===key)
  if(current!==generation)return
  if(choice==='server')pending.delete(key)
  else {const job=pending.get(key);if(job)job.version=remote?.version??0}
  if(remote)records.set(key,remote)
  publish({conflicts:state.conflicts.filter(k=>k!==key)});cache();remoteChanged();await syncCloud()
}
export function conflictCopies(key:string){return {local:pending.get(key)?.value??null,server:records.get(key)?.value??null}}
/** Stage a group only after validation and a durable tab-cache write succeed. */
export function stageMemberRecords(changes:ReadonlyMap<string,string|null>){
  if(!state.user)throw new Error('먼저 로그인해주세요.')
  const next=new Map(pending)
  for(const [key,value] of changes){
    if(value!==null&&new TextEncoder().encode(value).length>(investmentRecordLimits[key]??200_000))throw new Error('기록의 계정 저장 용량을 초과했습니다. 원본을 백업해주세요.')
    const previous=pending.get(key)
    next.set(key,{value,version:previous?.version??records.get(key)?.version??0})
  }
  try{sessionStorage.setItem(`investai.cloud.pending.${state.user.id}`,JSON.stringify([...next]))}
  catch{throw new Error('전송 대기 기록을 보관하지 못해 변경하지 않았습니다. 저장 공간을 확인해주세요.')}
  pending=next;publish({});scheduleSync()
}
export const researchStorage:Pick<Storage,'getItem'|'setItem'|'removeItem'>={
  getItem(key){return state.user?(pending.has(key)?pending.get(key)!.value:records.get(key)?.value??null):localStorage.getItem(key)},
  setItem(key,value){if(!state.user){localStorage.setItem(key,value);return}stageMemberRecords(new Map([[key,value]]))},
  removeItem(key){if(!state.user){localStorage.removeItem(key);return}stageMemberRecords(new Map([[key,null]]))},
}
export const memberStorage=researchStorage
export async function importGuestResearch(){
  if(!state.user)throw new Error('먼저 로그인해주세요.')
  const keys=['investai.research.observations.v1','investai.signal-presets.v1','investai.research.rules.v1','investai.research.events.v1',ETF_KEY]
  const copies=new Map<string,string>()
  for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key?.startsWith('investai.research.draft.v1.'))keys.push(key)}
  for(const key of keys){
    const guest=localStorage.getItem(key);if(!guest)continue
    const member=researchStorage.getItem(key)
    if(key===ETF_KEY){
      const old:EtfLedger=JSON.parse(guest),current:EtfLedger=member?JSON.parse(member):{version:1,rows:[]}
      if(!validEtfLedger(old)||!validEtfLedger(current))throw new Error('ETF 기록 형식을 확인해주세요. 원본은 그대로 두었습니다.')
      // Existing member values and their revision history win on the same asset/date.
      const rows=[...new Map([...old.rows,...current.rows].map(r=>[`${r.asset}:${r.date}`,r])).values()]
      const merged={version:1,rows}
      if(!validEtfLedger(merged))throw new Error('합친 ETF 기록이 1,000일을 넘습니다. 원본은 그대로 두었습니다.')
      copies.set(key,JSON.stringify(merged));continue
    }
    if(!member){copies.set(key,guest);continue}
    if(key.includes('.draft.'))continue // Never overwrite a member's unfinished note with a guest draft.
    const old=JSON.parse(guest),current=JSON.parse(member)
    if(Array.isArray(old)&&Array.isArray(current)){
      const map=new Map([...old,...current].map(row=>[row.id??row.asset,row]))
      const limit=key.includes('presets')?24:key.includes('rules')?30:100
      if(map.size>limit)throw new Error('합친 기록이 보관 한도를 넘습니다. 원본은 그대로 두었습니다. 먼저 내보내기를 해주세요.')
      copies.set(key,JSON.stringify([...map.values()].sort((a,b)=>(b.at??0)-(a.at??0))))
    }
  }
  for(const [key,value] of copies)researchStorage.setItem(key,value)
  remoteChanged();await syncCloud()
}
