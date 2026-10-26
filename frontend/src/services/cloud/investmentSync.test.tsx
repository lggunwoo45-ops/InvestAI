import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PropsWithChildren } from 'react'

const portfolioKey='investai.portfolio.v1',watchKey='investai.watchlist-account.v1'
const holding={id:'holding-a',exchange:'upbit',venue:'upbit-krw',instrumentId:'upbit-btc',symbol:'BTC',quoteCurrency:'KRW',averagePrice:100,quantity:2,targetPrice:150,stopPrice:80}
const guestPortfolio=JSON.stringify({version:1,positions:[holding]})
const guestLists=JSON.stringify({schemaVersion:1,watchlists:[{id:'crypto',name:'Crypto',isDefault:true,instrumentIds:['upbit-btc']}]})
const asRecord=(value:string,version=1)=>({value,version})
async function setup(){
  const users=new Map<string,Map<string,{value:string|null;version:number}>>([['alice',new Map()],['bobbie',new Map()]])
  let offline=false
  const fetcher=vi.fn(async(input:string,init?:RequestInit)=>{
    const path=new URL(input,'http://localhost').pathname.replace('/api/cloud',''),auth=(init?.headers as Record<string,string>)?.authorization?.replace('Bearer ','')??'alice'
    const db=users.get(auth)!,json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}})
    const rows=()=>[...db].map(([key,row])=>({key,...row}))
    if(path==='/status')return json({enabled:true,signup:true})
    if(path==='/login'){const name=JSON.parse(String(init?.body)).username;return json({token:name,user:{id:name,username:name}})}
    if(path==='/me')return json({user:{id:auth,username:auth},records:rows()})
    if(path==='/records'&&init?.method==='PUT'){
      if(offline)throw new Error('offline')
      const row=JSON.parse(String(init.body)),prior=db.get(row.key)
      if(row.version!==(prior?.version??0))return json({error:'conflict'},409)
      const saved={...row,version:row.version+1};db.set(row.key,saved);return json(saved)
    }
    if(path==='/records')return json({records:rows()})
    if(path==='/logout')return json({ok:true})
    throw new Error('Unexpected route '+path)
  })
  vi.stubGlobal('fetch',fetcher)
  const client=await import('./cloudClient');await client.initializeCloud();await client.signIn('login',{username:'alice',password:'long fixture passphrase'})
  await vi.waitFor(()=>expect(client.cloudSnapshot().syncing).toBe(false))
  return {client,users,fetcher,offline:(value:boolean)=>{offline=value}}
}
describe('investment account sync',()=>{
  beforeEach(()=>{vi.resetModules();localStorage.clear();sessionStorage.clear()})
  afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()})
  it('isolates unsaved analysis notes from guests and other accounts',async()=>{
    const {client}=await setup(),analysis=await import('@/services/myAnalysis/analysisSession')
    const draft={query:'instrumentId=upbit-btc',tab:'summary' as const,intent:'holding' as const,note:'Alice private analysis',averagePrice:'100',positionBasis:''}
    sessionStorage.setItem(analysis.ANALYSIS_SESSION_KEY,JSON.stringify({...draft,note:'guest draft'}))
    expect(analysis.readAnalysisSession()).toBeNull();analysis.saveAnalysisSession(draft)
    await client.signOut();expect(analysis.readAnalysisSession()?.note).toBe('guest draft')
    await client.signIn('login',{username:'bobbie',password:'long fixture passphrase'});expect(analysis.readAnalysisSession()).toBeNull()
    await client.signOut();await client.signIn('login',{username:'alice',password:'long fixture passphrase'});expect(analysis.readAnalysisSession()?.note).toBe('Alice private analysis')
  })
  it('imports only after preview, keeps guest data, transfers ledger and preserves deletion across login',async()=>{
    const {client,users}=await setup(),portfolio=await import('@/services/portfolio/portfolioStorage'),ledger=await import('@/services/portfolio/tradeLedger')
    const traded=ledger.recordTrade(holding as import('@/services/portfolio/portfolioStorage').Position,{id:'buy-a',side:'buy',price:110,quantity:1,fee:1,at:'2026-10-20T00:00:00.000Z'},Date.parse('2026-10-26'))
    const original=JSON.stringify({version:2,positions:[traded]});localStorage.setItem(portfolioKey,original);localStorage.setItem('investai.watchlists.v2',guestLists)
    expect(portfolio.readPortfolio().positions).toEqual([])
    const importer=await import('./investmentImport'),preview=importer.previewGuestInvestments({portfolio:true,watchlists:true,scenarios:false})
    expect(users.get('alice')!.size).toBe(0)
    await importer.confirmInvestmentImport(preview)
    expect(portfolio.readPortfolio().positions[0]).toEqual(traded);expect(users.get('alice')!.has(watchKey)).toBe(true)
    expect(localStorage.getItem(portfolioKey)).toBe(original);expect(localStorage.getItem('investai.watchlists.v2')).toBe(guestLists)
    await client.signOut();expect(portfolio.readPortfolio().positions[0]).toEqual(traded)
    await client.signIn('login',{username:'alice',password:'long fixture passphrase'});await vi.waitFor(()=>expect(client.cloudSnapshot().syncing).toBe(false))
    const state=portfolio.readPortfolio();portfolio.writePortfolio([],state.raw);await client.syncCloud()
    await client.signOut();expect(portfolio.readPortfolio().positions).toHaveLength(1)
    await client.signIn('login',{username:'alice',password:'long fixture passphrase'});expect(portfolio.readPortfolio().positions).toEqual([])
  })
  it('rejects changed previews and differing holding IDs before staging any import',async()=>{
    const {client,users}=await setup(),importer=await import('./investmentImport')
    localStorage.setItem(portfolioKey,guestPortfolio)
    const preview=importer.previewGuestInvestments({portfolio:true,watchlists:false,scenarios:false})
    localStorage.setItem(portfolioKey,JSON.stringify({version:1,positions:[{...holding,quantity:3}]}))
    await expect(importer.confirmInvestmentImport(preview)).rejects.toThrow('미리보기 후')
    expect(client.cloudSnapshot().pending).toBe(0)
    users.get('alice')!.set(portfolioKey,asRecord(guestPortfolio));await client.syncCloud()
    expect(()=>importer.previewGuestInvestments({portfolio:true,watchlists:false,scenarios:false})).toThrow('같은 보유 기록')
    expect(client.cloudSnapshot().pending).toBe(0)
  })
  it('retains both copies on remote conflict, supports server choice and isolates another member',async()=>{
    const {client,users}=await setup(),portfolio=await import('@/services/portfolio/portfolioStorage')
    users.get('alice')!.set(portfolioKey,asRecord(guestPortfolio));await client.syncCloud()
    const first=portfolio.readPortfolio()
    users.get('alice')!.set(portfolioKey,asRecord(JSON.stringify({version:1,positions:[{...holding,quantity:8}]}),2))
    portfolio.writePortfolio([{...first.positions[0],quantity:5}],first.raw);await client.syncCloud()
    expect(client.cloudSnapshot().conflicts).toEqual([portfolioKey])
    expect(JSON.parse(client.conflictCopies(portfolioKey).local!).positions[0].quantity).toBe(5)
    expect(JSON.parse(client.conflictCopies(portfolioKey).server!).positions[0].quantity).toBe(8)
    await client.resolveCloudConflict(portfolioKey,'server');expect(portfolio.readPortfolio().positions[0].quantity).toBe(8)
    await client.signOut();await client.signIn('login',{username:'bobbie',password:'long fixture passphrase'})
    expect(portfolio.readPortfolio().positions).toEqual([]);expect(users.get('bobbie')!.size).toBe(0)
  })
  it('keeps offline changes recoverable and rejects edits when pending storage is unavailable',async()=>{
    const {client,offline}=await setup(),portfolio=await import('@/services/portfolio/portfolioStorage')
    offline(true);portfolio.writePortfolio([holding as import('@/services/portfolio/portfolioStorage').Position],null);await client.syncCloud()
    expect(sessionStorage.getItem('investai.cloud.pending.alice')).toContain('holding-a')
    await expect(client.signOut()).rejects.toThrow('전송하지 못한')
    const previous=portfolio.readPortfolio(),set=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('quota')})
    expect(()=>portfolio.writePortfolio([],previous.raw)).toThrow('전송 대기 기록')
    expect(portfolio.readPortfolio().raw).toBe(previous.raw);set.mockRestore()
    offline(false);await client.syncCloud();expect(client.cloudSnapshot().pending).toBe(0)
  })
  it('updates mounted watchlists without echo uploads and keeps guest groups untouched',async()=>{
    const {client,users,fetcher}=await setup();localStorage.setItem('investai.watchlists.v2',guestLists)
    const {WatchlistProvider}=await import('@/store/WatchlistProvider'),{useWatchlists}=await import('@/hooks/useWatchlists')
    const wrapper=({children}:PropsWithChildren)=><WatchlistProvider>{children}</WatchlistProvider>
    const view=renderHook(()=>useWatchlists(),{wrapper})
    expect(view.result.current.favoriteIds.size).toBe(0)
    act(()=>view.result.current.createWatchlist('My signals'))
    act(()=>view.result.current.toggleFavorite('upbit-eth'))
    act(()=>view.result.current.saveReviewJournal('upbit-eth','member note','watch reason'))
    await act(()=>client.syncCloud())
    const saved=JSON.parse(users.get('alice')!.get(watchKey)!.value!)
    expect(saved.items[0].note).toBe('member note')
    expect(localStorage.getItem('investai.watchlists.v2')).toBe(guestLists)
    const before=fetcher.mock.calls.filter(([,init])=>init?.method==='PUT').length
    saved.watchlists=saved.watchlists.filter((list:{isDefault:boolean})=>list.isDefault).map((list:{instrumentIds:string[]})=>({...list,instrumentIds:[]}));saved.items=[]
    users.get('alice')!.set(watchKey,asRecord(JSON.stringify(saved),2))
    await act(()=>client.syncCloud())
    expect(view.result.current.favoriteIds.size).toBe(0);expect(view.result.current.watchlistItems).toEqual([])
    expect(fetcher.mock.calls.filter(([,init])=>init?.method==='PUT')).toHaveLength(before)
    view.unmount()
  })
})
