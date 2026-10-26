import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react'
import { itemFromInstrument, reviewItem, updateReviewJournal, sanitizeItems, WATCHLIST_REVIEW_KEY, type ReviewSnapshot, type WatchlistItem } from '@/services/watchlist/watchlistStorage'
import { readWatchlistStore, writeWatchlistStore, targetListId, type WatchlistStore, type WatchlistBundle } from '@/services/watchlist/watchlistAccountStore'
import { CLOUD_RECORDS_CHANGED, cloudSignedIn, cloudSnapshot } from '@/services/cloud/cloudClient'
import { marketDataService } from '@/services/market/marketDataService'
import { WatchlistContext, type WatchlistValue } from '@/store/watchlistContext'
import { MAX_CUSTOM_WATCHLISTS, reorderIds, WATCHLIST_SCHEMA_VERSION } from '@/utils/watchlists'
import { loadStoredRecentlyViewed, RECENTLY_VIEWED_STORAGE_KEY, WATCHLIST_STORAGE_KEY } from '@/utils/watchlistStorage'

function materialize(store:WatchlistBundle,at:string):WatchlistItem[]{
  const ids=[...new Set(store.watchlists.flatMap(list=>list.instrumentIds))],known=marketDataService.getKnownInstruments(ids)
  return ids.map(id=>store.items.find(item=>item.instrumentId===id)??(known.has(id)?itemFromInstrument(known.get(id)!,at):{instrumentId:id,symbol:id,displayName:id,marketType:targetListId(id)==='crypto'?'crypto':'stock',addedAt:at,updatedAt:at}))
}
export function WatchlistProvider({ children }: PropsWithChildren) {
  const [mountedAt]=useState(()=>new Date().toISOString())
  const [store,setStore]=useState(readWatchlistStore),storeRef=useRef(store)
  const [error,setError]=useState('')
  const [activeReview,setActiveReview]=useState<{instrumentId:string;snapshot:ReviewSnapshot}|null>(null)
  const [selectedId,setActiveWatchlistId]=useState('crypto')
  const [recentKey]=useState(()=>cloudSnapshot().user?`${RECENTLY_VIEWED_STORAGE_KEY}.${cloudSnapshot().user!.id}`:RECENTLY_VIEWED_STORAGE_KEY)
  const [recentlyViewedIds,setRecentlyViewedIds]=useState<readonly string[]>(()=>{
    if(!cloudSignedIn())return loadStoredRecentlyViewed()
    try{const rows=JSON.parse(localStorage.getItem(recentKey)??'{}').recentlyViewedIds;return Array.isArray(rows)&&rows.every(v=>typeof v==='string')?rows.slice(0,8):[]}catch{return []}
  })
  const load=useCallback(()=>{
    const next=readWatchlistStore();storeRef.current=next;setStore(next);setActiveReview(null)
  },[])
  useEffect(()=>{
    const remote=()=>{if(cloudSignedIn())load()}
    const local=(event:StorageEvent)=>{if(!cloudSignedIn()&&[null,WATCHLIST_STORAGE_KEY,WATCHLIST_REVIEW_KEY].includes(event.key))load()}
    window.addEventListener(CLOUD_RECORDS_CHANGED,remote);window.addEventListener('storage',local)
    return()=>{window.removeEventListener(CLOUD_RECORDS_CHANGED,remote);window.removeEventListener('storage',local)}
  },[load])
  useEffect(()=>{
    try{localStorage.setItem(recentKey,JSON.stringify({schemaVersion:WATCHLIST_SCHEMA_VERSION,recentlyViewedIds}))}catch{/* Recent views are device-local navigation history. */}
  },[recentKey,recentlyViewedIds])
  const mutate=useCallback((change:(value:WatchlistStore)=>WatchlistBundle)=>{
    try{
      const current=storeRef.current;if(current.error)throw new Error('storage')
      const next=writeWatchlistStore(change(current),current.raw)
      storeRef.current=next;setStore(next);setError('')
    }catch{setError('관심종목을 저장하지 못했습니다. 기존 기록은 보존됩니다. 계정의 동기화 상태와 저장 공간을 확인해주세요.')}
  },[])
  const updateItems=useCallback((id:string,change:(ids:readonly string[])=>readonly string[])=>{
    mutate(current=>({...current,watchlists:current.watchlists.map(list=>list.id===id?{...list,instrumentIds:change(list.instrumentIds)}:list)}))
  },[mutate])
  const toggleInWatchlist=useCallback((listId:string,id:string)=>updateItems(listId,ids=>ids.includes(id)?ids.filter(v=>v!==id):[...ids,id]),[updateItems])
  const toggleFavorite=useCallback((id:string)=>mutate(current=>{
    const exists=current.watchlists.some(list=>list.instrumentIds.includes(id))
    return {...current,items:current.items.filter(item=>item.instrumentId!==id),watchlists:current.watchlists.map(list=>exists?{...list,instrumentIds:list.instrumentIds.filter(v=>v!==id)}:list.id===targetListId(id)?{...list,instrumentIds:[...list.instrumentIds,id]}:list)}
  }),[mutate])
  const createWatchlist=useCallback((name:string)=>{
    const trimmed=name.trim(),current=storeRef.current
    if(!trimmed||trimmed.length>160||current.watchlists.some(list=>list.name.toLocaleLowerCase()===trimmed.toLocaleLowerCase())||current.watchlists.filter(list=>!list.isDefault).length>=MAX_CUSTOM_WATCHLISTS)return
    const id=`list-${crypto.randomUUID()}`
    mutate(value=>({...value,watchlists:[...value.watchlists,{id,name:trimmed,instrumentIds:[],isDefault:false}]}));setActiveWatchlistId(id)
  },[mutate])
  const deleteWatchlist=useCallback((id:string)=>{
    if(!storeRef.current.watchlists.some(list=>list.id===id&&!list.isDefault))return
    mutate(current=>({...current,watchlists:current.watchlists.filter(list=>list.id!==id)}));setActiveWatchlistId(current=>current===id?'crypto':current)
  },[mutate])
  const removeFromWatchlist=useCallback((listId:string,id?:string)=>{
    if(id!==undefined)updateItems(listId,ids=>ids.filter(v=>v!==id))
    else mutate(current=>({...current,items:current.items.filter(item=>item.instrumentId!==listId),watchlists:current.watchlists.map(list=>({...list,instrumentIds:list.instrumentIds.filter(v=>v!==listId)}))}))
  },[mutate,updateItems])
  const reorderWatchlist=useCallback((id:string,from:number,to:number)=>updateItems(id,ids=>reorderIds(ids,from,to)),[updateItems])
  const trackRecentlyViewed=useCallback((id:string)=>setRecentlyViewedIds(current=>[id,...current.filter(v=>v!==id)].slice(0,8)),[])
  const addToWatchlist=useCallback((item:WatchlistItem)=>{
    const valid=sanitizeItems([item])[0];if(!valid)return
    mutate(current=>({...current,items:[...current.items.filter(v=>v.instrumentId!==valid.instrumentId),current.items.find(v=>v.instrumentId===valid.instrumentId)??valid],watchlists:current.watchlists.some(list=>list.instrumentIds.includes(valid.instrumentId))?current.watchlists:current.watchlists.map(list=>list.id===targetListId(valid.instrumentId)?{...list,instrumentIds:[...list.instrumentIds,valid.instrumentId]}:list)}))
  },[mutate])
  const toggleWatchlist=useCallback((item:WatchlistItem)=>{
    if(storeRef.current.watchlists.some(list=>list.instrumentIds.includes(item.instrumentId)))removeFromWatchlist(item.instrumentId)
    else addToWatchlist(item)
  },[addToWatchlist,removeFromWatchlist])
  const markReviewed=useCallback((id:string,snapshot:ReviewSnapshot)=>{
    if(!storeRef.current.watchlists.some(list=>list.instrumentIds.includes(id)))return
    mutate(current=>({...current,items:reviewItem(materialize(current,mountedAt),id,snapshot)}))
  },[mutate,mountedAt])
  const saveReviewJournal=useCallback((id:string,note:string,reason:string)=>{
    if(!storeRef.current.watchlists.some(list=>list.instrumentIds.includes(id)))return
    mutate(current=>({...current,items:updateReviewJournal(materialize(current,mountedAt),id,note,reason)}))
  },[mutate,mountedAt])
  const watchlistItems=useMemo(()=>materialize(store,mountedAt),[store,mountedAt])
  const favoriteIds=useMemo(()=>new Set(store.watchlists.flatMap(list=>list.instrumentIds)),[store.watchlists])
  const isWatchlisted=useCallback((id:string)=>favoriteIds.has(id),[favoriteIds])
  const getWatchlistItem=useCallback((id:string)=>watchlistItems.find(item=>item.instrumentId===id),[watchlistItems])
  const activeWatchlistId=store.watchlists.some(list=>list.id===selectedId)?selectedId:store.watchlists[0]?.id??'crypto'
  const value=useMemo<WatchlistValue>(()=>({watchlistItems,isWatchlisted,addToWatchlist,toggleWatchlist,markReviewed,saveReviewJournal,getWatchlistItem,activeReview,setActiveReview,watchlists:store.watchlists,activeWatchlistId,favoriteIds,recentlyViewedIds,setActiveWatchlistId,createWatchlist,deleteWatchlist,toggleFavorite,toggleInWatchlist,removeFromWatchlist,reorderWatchlist,trackRecentlyViewed}),[watchlistItems,isWatchlisted,addToWatchlist,toggleWatchlist,markReviewed,saveReviewJournal,getWatchlistItem,activeReview,store.watchlists,activeWatchlistId,favoriteIds,recentlyViewedIds,createWatchlist,deleteWatchlist,toggleFavorite,toggleInWatchlist,removeFromWatchlist,reorderWatchlist,trackRecentlyViewed])
  return <WatchlistContext value={value}>{(error||store.error)&&<p role="alert">{error||'관심종목 기록을 읽지 못해 변경을 중지했습니다.'}<button onClick={()=>{load();setError('')}}>기록 다시 읽기</button></p>}{children}</WatchlistContext>
}
