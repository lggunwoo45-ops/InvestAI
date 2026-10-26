import { cloudSnapshot, memberStorage, notifyCloudRecords, stageMemberRecords, syncCloud } from './cloudClient'
import { PORTFOLIO_KEY, validPortfolioData } from '@/services/portfolio/portfolioStorage'
import { mergePortfolioBackup } from '@/services/portfolio/portfolioBackup'
import { WATCHLIST_ACCOUNT_KEY, emptyMemberWatchlists, targetListId, validWatchlistBundle, type WatchlistBundle } from '@/services/watchlist/watchlistAccountStore'
import { sanitizeItems, WATCHLIST_REVIEW_KEY } from '@/services/watchlist/watchlistStorage'
import { WATCHLIST_STORAGE_KEY } from '@/utils/watchlistStorage'
import { isWatchlistStoragePayload } from '@/utils/watchlists'
import { SCENARIO_KEY, validScenarioData } from '@/services/scenarios/scenarioStorage'

export interface ImportSelection { portfolio:boolean; watchlists:boolean; scenarios:boolean }
interface ImportRow { key:string; value:string; expected:string|null }
export interface InvestmentImportPreview { owner:string; source:[string,string|null][]; rows:ImportRow[]; summary:string[] }
const canonical=(value:unknown):string=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value!==null&&typeof value==='object'?`{${Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`:JSON.stringify(value)
function mergeRows<T>(current:readonly T[],incoming:readonly T[],id:(row:T)=>string,label:string):T[]{
  const map=new Map(current.map(row=>[id(row),row]))
  for(const row of incoming){const old=map.get(id(row));if(old&&canonical(old)!==canonical(row))throw new Error(`${label} 중 같은 항목의 내용이 다릅니다. 가져오기를 중지했습니다. 두 기록을 내려받아 확인해주세요.`);map.set(id(row),old??row)}
  return [...map.values()]
}
function mergeWatchlists(current:WatchlistBundle,incoming:WatchlistBundle):WatchlistBundle {
  const lists=new Map(current.watchlists.map(list=>[list.id,list]))
  for(const list of incoming.watchlists){
    const prior=lists.get(list.id)
    if(prior&&(prior.name!==list.name||prior.isDefault!==list.isDefault))throw new Error('같은 관심목록의 이름이 다릅니다. 원본을 확인해주세요.')
    lists.set(list.id,prior?{...prior,instrumentIds:[...new Set([...prior.instrumentIds,...list.instrumentIds])]}:list)
  }
  const result:WatchlistBundle={version:1,watchlists:[...lists.values()],items:mergeRows(current.items,incoming.items,item=>item.instrumentId,'관심종목 메모')}
  if(!validWatchlistBundle(result))throw new Error('합친 관심종목의 형식 또는 저장 한도를 확인해주세요.')
  return result
}
export function previewGuestInvestments(selection:ImportSelection):InvestmentImportPreview {
  const owner=cloudSnapshot().user?.id;if(!owner)throw new Error('먼저 로그인해주세요.')
  const source=new Map<string,string|null>(),rows:ImportRow[]=[],summary:string[]=[]
  const guest=(key:string)=>{const raw=localStorage.getItem(key);source.set(key,raw);return raw}
  const add=(key:string,value:unknown)=>{const expected=memberStorage.getItem(key),text=JSON.stringify(value);if(expected!==text)rows.push({key,value:text,expected})}
  if(selection.portfolio){
    const raw=guest(PORTFOLIO_KEY)
    if(raw!==null){
      const incoming=JSON.parse(raw),current=JSON.parse(memberStorage.getItem(PORTFOLIO_KEY)??'{"version":1,"positions":[]}')
      if(!validPortfolioData(incoming)||!validPortfolioData(current))throw new Error('보유·거래 기록을 읽지 못했습니다. 원본을 보존하고 가져오기를 중지했습니다.')
      let merged
      try{merged=mergePortfolioBackup(current.positions,incoming.positions)}catch{throw new Error('같은 보유 기록의 내용이 다르거나 저장 한도를 넘습니다. 백업 파일을 비교해주세요.')}
      add(PORTFOLIO_KEY,{version:2,positions:merged.positions});summary.push(`보유 기록 ${merged.added}개 추가 · 동일 기록 ${merged.skipped}개 유지`)
    }
  }
  if(selection.watchlists){
    const listsRaw=guest(WATCHLIST_STORAGE_KEY),itemsRaw=guest(WATCHLIST_REVIEW_KEY)
    if(listsRaw!==null||itemsRaw!==null){
      const listData=listsRaw===null?{schemaVersion:1,watchlists:emptyMemberWatchlists().watchlists}:JSON.parse(listsRaw),original=JSON.parse(itemsRaw??'[]')
      if(!isWatchlistStoragePayload(listData)||!Array.isArray(original))throw new Error('브라우저 관심목록을 읽지 못했습니다.')
      const items=sanitizeItems(original)
      if(items.length!==original.length)throw new Error('브라우저 관심종목 메모를 읽지 못했습니다.')
      const watchlists=listData.watchlists.map(list=>({...list,instrumentIds:[...new Set([...list.instrumentIds,...items.filter(item=>targetListId(item.instrumentId)===list.id).map(item=>item.instrumentId)])]}))
      const current=JSON.parse(memberStorage.getItem(WATCHLIST_ACCOUNT_KEY)??JSON.stringify(emptyMemberWatchlists())),incoming:WatchlistBundle={version:1,watchlists,items}
      if(!validWatchlistBundle(current)||!validWatchlistBundle(incoming))throw new Error('관심종목 형식 또는 저장 한도를 확인해주세요.')
      const merged=mergeWatchlists(current,incoming)
      add(WATCHLIST_ACCOUNT_KEY,merged);summary.push(`관심목록 ${merged.watchlists.length}개 · 종목 ${new Set(merged.watchlists.flatMap(list=>list.instrumentIds)).size}개로 합치기`)
    }
  }
  if(selection.scenarios){
    const raw=guest(SCENARIO_KEY)
    if(raw!==null){
      const incoming=JSON.parse(raw),current=JSON.parse(memberStorage.getItem(SCENARIO_KEY)??'{"version":1,"scenarios":[],"events":[]}')
      if(!validScenarioData(current)||!validScenarioData(incoming))throw new Error('가격 시나리오 기록을 읽지 못했습니다.')
      const merged={version:1,scenarios:mergeRows(current.scenarios,incoming.scenarios,row=>row.id,'가격 시나리오'),events:mergeRows(current.events,incoming.events,row=>row.id,'시나리오 변화 기록')}
      if(!validScenarioData(merged))throw new Error('같은 종목의 시나리오가 겹치거나 감시 한도를 넘습니다. 원본을 확인해주세요.')
      add(SCENARIO_KEY,merged);summary.push(`가격 시나리오 ${merged.scenarios.length}개 · 변화 기록 ${merged.events.length}개로 합치기`)
    }
  }
  return {owner,source:[...source],rows,summary}
}
export async function confirmInvestmentImport(preview:InvestmentImportPreview){
  if(cloudSnapshot().user?.id!==preview.owner)throw new Error('계정이 바뀌었습니다. 미리보기를 다시 확인해주세요.')
  if(preview.source.some(([key,raw])=>localStorage.getItem(key)!==raw)||preview.rows.some(row=>memberStorage.getItem(row.key)!==row.expected))throw new Error('미리보기 후 기록이 바뀌었습니다. 다시 미리보기를 해주세요.')
  stageMemberRecords(new Map(preview.rows.map(row=>[row.key,row.value])));notifyCloudRecords();await syncCloud()
  if(cloudSnapshot().pending)throw new Error('가져온 자료의 전송이 남아 있습니다. 위의 동기화 상태와 충돌을 확인해주세요. 브라우저 원본은 보존했습니다.')
}
