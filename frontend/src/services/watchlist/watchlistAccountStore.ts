import { cloudSignedIn, memberStorage } from '@/services/cloud/cloudClient'
import { defaultWatchlists, isWatchlistStoragePayload, WATCHLIST_SCHEMA_VERSION } from '@/utils/watchlists'
import { loadStoredWatchlists, WATCHLIST_STORAGE_KEY } from '@/utils/watchlistStorage'
import { loadWatchlist, sanitizeItems, WATCHLIST_REVIEW_KEY, type WatchlistItem } from './watchlistStorage'
import { validInvestmentEnvelope } from '../../../../backend/cloud/recordPolicy.mjs'
import type { Watchlist } from '@/types/dashboard'

export const WATCHLIST_ACCOUNT_KEY='investai.watchlist-account.v1'
export interface WatchlistBundle { version:1; watchlists:readonly Watchlist[]; items:readonly WatchlistItem[] }
export interface WatchlistStore extends WatchlistBundle { raw:string|null; error:boolean }
export const emptyMemberWatchlists=():WatchlistBundle=>({version:1,watchlists:defaultWatchlists.map(list=>({...list,instrumentIds:[]})),items:[]})
export function validWatchlistBundle(value:unknown):value is WatchlistBundle {
  if(!validInvestmentEnvelope(WATCHLIST_ACCOUNT_KEY,value))return false
  const data=value as WatchlistBundle
  return isWatchlistStoragePayload({schemaVersion:WATCHLIST_SCHEMA_VERSION,watchlists:data.watchlists}) && sanitizeItems(data.items).length===data.items.length
}
export function readWatchlistStore():WatchlistStore {
  if(cloudSignedIn()){
    const raw=memberStorage.getItem(WATCHLIST_ACCOUNT_KEY)
    try{const data=raw===null?emptyMemberWatchlists():JSON.parse(raw);if(!validWatchlistBundle(data))throw new Error('invalid');return {...data,raw,error:false}}
    catch{return {...emptyMemberWatchlists(),raw,error:true}}
  }
  const items=loadWatchlist(),lists=loadStoredWatchlists()
  const watchlists=lists.map(list=>({...list,instrumentIds:[...new Set([...list.instrumentIds,...items.filter(item=>targetListId(item.instrumentId)===list.id).map(item=>item.instrumentId)])]}))
  return {version:1,watchlists,items,raw:null,error:false}
}
export function targetListId(id:string){return id.startsWith('krx-')?'korea':id.startsWith('us-')?'us':'crypto'}
export function writeWatchlistStore(data:WatchlistBundle,expectedRaw:string|null):WatchlistStore {
  const ids=new Set(data.watchlists.flatMap(list=>list.instrumentIds))
  const next:WatchlistBundle={version:1,watchlists:data.watchlists,items:sanitizeItems(data.items).filter(item=>ids.has(item.instrumentId))}
  if(!validWatchlistBundle(next))throw new Error('validation')
  if(cloudSignedIn()){
    if(memberStorage.getItem(WATCHLIST_ACCOUNT_KEY)!==expectedRaw)throw new Error('conflict')
    const raw=JSON.stringify(next);memberStorage.setItem(WATCHLIST_ACCOUNT_KEY,raw)
    return {...next,raw,error:false}
  }
  localStorage.setItem(WATCHLIST_REVIEW_KEY,JSON.stringify(next.items))
  localStorage.setItem(WATCHLIST_STORAGE_KEY,JSON.stringify({schemaVersion:WATCHLIST_SCHEMA_VERSION,watchlists:next.watchlists}))
  return {...next,raw:null,error:false}
}
