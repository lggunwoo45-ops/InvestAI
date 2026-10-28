import { beforeEach,afterEach,describe,it,expect,vi } from 'vitest'

describe('member research synchronization',()=>{
  it('imports guest ETF records only on request and preserves existing member values and revisions',async()=>{
    const {client,fetcher}=await setup()
    const key='investai.etf-ledger.v1'
    const row={asset:'BTC',date:'2026-01-01',flow:100,source:'guest',updatedAt:1,revision:1,previous:[]}
    localStorage.setItem(key,JSON.stringify({version:1,rows:[row,{...row,asset:'ETH'}]}))
    expect(client.researchStorage.getItem(key)).toBeNull()
    client.researchStorage.setItem(key,JSON.stringify({version:1,rows:[{...row,flow:200,source:'member',revision:2,previous:[{flow:150,source:'earlier',updatedAt:1}]}]}))
    await client.syncCloud();await client.importGuestResearch()
    const writes=fetcher.mock.calls.filter(([,init])=>init?.method==='PUT').map(([,init])=>JSON.parse(String(init?.body))).filter(r=>r.key===key)
    const merged=JSON.parse(writes.at(-1).value)
    expect(merged.rows).toHaveLength(2)
    expect(merged.rows.find((r:{asset:string})=>r.asset==='BTC')).toMatchObject({flow:200,source:'member',revision:2,previous:[{flow:150}]})
    expect(JSON.parse(localStorage.getItem(key)!).rows[0].flow).toBe(100)
  })
  beforeEach(()=>{vi.resetModules();sessionStorage.clear();localStorage.clear()})
  afterEach(()=>{vi.unstubAllGlobals()})
  async function setup(){
    let version=0,value:string|null=null,conflict=false,fail=false
    const fetcher=vi.fn(async(input:string,init?:RequestInit)=>{
      const path=new URL(input,'http://localhost').pathname.replace('/api/cloud','')
      const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}})
      if(path==='/status')return json({enabled:true,signup:true})
      if(path==='/login'||path==='/register')return json({token:'test-session',user:{id:'member-a',username:'alice'},recovery:path==='/register'?'test-recovery':undefined})
      if(path==='/me')return json({user:{id:'member-a',username:'alice'},records:value===null?[]:[{key:'investai.research.draft.v1.BTC',value,version}]})
      if(path==='/records'&&init?.method==='PUT'){
        if(fail)throw new Error('network offline')
        const row=JSON.parse(String(init.body));if(conflict||row.version!==version)return json({error:'conflict'},409)
        value=row.value;version++;return json({...row,version})
      }
      if(path==='/records')return json({records:value===null?[]:[{key:'investai.research.draft.v1.BTC',value,version}]})
      if(path==='/logout')return json({ok:true})
      throw new Error('unexpected '+path)
    })
    vi.stubGlobal('fetch',fetcher)
    const client=await import('./cloudClient');await client.initializeCloud();await client.signIn('register',{username:'alice',password:'a long test passphrase'})
    await vi.waitFor(()=>expect(client.cloudSnapshot().syncing).toBe(false))
    return {client,fetcher,remote(next:string){value=next;version++},conflict(next:boolean){conflict=next},offline(next:boolean){fail=next},value:()=>value}
  }
  it('keeps guest data separate, queues member writes and retains recovery code across identity changes',async()=>{
    localStorage.setItem('investai.research.draft.v1.BTC','guest note')
    const {client,value}=await setup()
    expect(client.researchStorage.getItem('investai.research.draft.v1.BTC')).toBeNull()
    expect(client.cloudSnapshot().recovery).toBe('test-recovery')
    client.researchStorage.setItem('investai.research.draft.v1.BTC','member note')
    await vi.waitFor(()=>expect(client.cloudSnapshot().pending).toBe(0))
    expect(value()).toBe('member note');expect(localStorage.getItem('investai.research.draft.v1.BTC')).toBe('guest note')
    expect(localStorage.getItem('investai.cloud.session')).toBeNull()
    await client.signOut();expect(client.researchStorage.getItem('investai.research.draft.v1.BTC')).toBe('guest note')
  })
  it('refreshing verified email preserves pending records and does not switch account context',async()=>{
    const {client,fetcher,offline}=await setup()
    offline(true)
    client.researchStorage.setItem('investai.research.draft.v1.BTC','unsent note')
    await client.syncCloud()
    fetcher.mockResolvedValueOnce(Response.json({user:{id:'member-a',username:'alice',email:'alice@example.test',emailVerifiedAt:1}}))
    await client.refreshMember()
    expect(client.cloudSnapshot().user?.email).toBe('alice@example.test')
    expect(client.cloudSnapshot().pending).toBe(1)
    expect(client.researchStorage.getItem('investai.research.draft.v1.BTC')).toBe('unsent note')
    offline(false);await client.syncCloud()
  })
  it('does not silently overwrite another device and keeps both conflict copies',async()=>{
    const {client,remote,conflict,value}=await setup();remote('other device');conflict(true)
    client.researchStorage.setItem('investai.research.draft.v1.BTC','my note')
    await client.syncCloud()
    expect(value()).toBe('other device');expect(client.cloudSnapshot().pending).toBe(1)
    expect(client.conflictCopies('investai.research.draft.v1.BTC')).toEqual({local:'my note',server:'other device'})
    conflict(false);await client.resolveCloudConflict('investai.research.draft.v1.BTC','mine')
    expect(value()).toBe('my note');expect(client.cloudSnapshot().pending).toBe(0)
  })
  it('retains failed uploads in a member-scoped tab cache and prevents accidental logout',async()=>{
    const {client,offline}=await setup();offline(true)
    client.researchStorage.setItem('investai.research.draft.v1.BTC','unsent note')
    await client.syncCloud()
    expect(client.cloudSnapshot().pending).toBe(1)
    expect(sessionStorage.getItem('investai.cloud.pending.member-a')).toContain('unsent note')
    await expect(client.signOut()).rejects.toThrow('전송하지 못한')
    offline(false);await client.syncCloud();expect(client.cloudSnapshot().pending).toBe(0)
  })
  it('applies another device update and imports guest drafts only when the member has no draft',async()=>{
    const {client,remote}=await setup();remote('server draft');await client.syncCloud()
    expect(client.researchStorage.getItem('investai.research.draft.v1.BTC')).toBe('server draft')
    localStorage.setItem('investai.research.draft.v1.BTC','older guest draft');await client.importGuestResearch()
    expect(client.researchStorage.getItem('investai.research.draft.v1.BTC')).toBe('server draft')
    expect(localStorage.getItem('investai.research.draft.v1.BTC')).toBe('older guest draft')
  })
  it('coalesces rapid edits and flushes an edit made while an upload is in flight',async()=>{
    const {client,fetcher,value}=await setup(),key='investai.research.draft.v1.BTC'
    const original=fetcher.getMockImplementation()!
    let release=()=>{}
    fetcher.mockImplementationOnce(async(input,init)=>{await new Promise<void>(resolve=>{release=resolve});return original(input,init)})
    for(let i=0;i<10;i++)client.researchStorage.setItem(key,`draft ${i}`)
    const upload=client.syncCloud()
    client.researchStorage.setItem(key,'final edit during upload')
    release();await upload
    await vi.waitFor(()=>expect(client.cloudSnapshot().pending).toBe(0))
    expect(value()).toBe('final edit during upload')
    expect(fetcher.mock.calls.filter(([,init])=>init?.method==='PUT')).toHaveLength(2)
  })
  it('keeps writes on their original account while the next login loads and ignores stale unauthorized responses',async()=>{
    const {client,fetcher}=await setup(),original=fetcher.getMockImplementation()!
    const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}})
    let releaseLogin=()=>{},releaseOld=()=>{},entered=()=>{}
    const loading=new Promise<void>(resolve=>{entered=resolve})
    fetcher.mockImplementation(async(input,init)=>{
      const auth=(init?.headers as Record<string,string>)?.authorization
      if(input.endsWith('/login'))return json({token:'member-b-session',user:{id:'member-b',username:'bobbie'}})
      if(input.endsWith('/old-request')){await new Promise<void>(resolve=>{releaseOld=resolve});return json({error:'expired'},401)}
      if(input.endsWith('/me')&&auth==='Bearer member-b-session'){entered();await new Promise<void>(resolve=>{releaseLogin=resolve});return json({records:[]})}
      if(input.endsWith('/records')&&auth==='Bearer member-b-session')return json({records:[]})
      return original(input,init)
    })
    const stale=client.cloudRequest('/old-request').catch(error=>error)
    const login=client.signIn('login',{username:'bobbie',password:'a different test passphrase'})
    await loading
    client.researchStorage.setItem('investai.research.draft.v1.BTC','Alice private note')
    await client.syncCloud()
    const upload=fetcher.mock.calls.find(([,init])=>init?.method==='PUT')!
    expect((upload[1]!.headers as Record<string,string>).authorization).toBe('Bearer test-session')
    releaseLogin();await login;releaseOld();await stale
    expect(client.cloudSnapshot().user?.id).toBe('member-b')
    expect(client.cloudSnapshot().expired).toBe(false)
    expect(client.researchStorage.getItem('investai.research.draft.v1.BTC')).toBeNull()
  })
  it('keeps the member store selected after session expiry instead of falling back to the PC vault',async()=>{
    const {client,fetcher}=await setup()
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({error:'expired'}),{status:401,headers:{'content-type':'application/json'}}))
    await expect(client.cloudRequest('/monitor')).rejects.toThrow('expired')
    expect(client.cloudSnapshot().expired).toBe(true)
    expect(client.cloudSignedIn()).toBe(true)
    expect(client.cloudSnapshot().user?.id).toBe('member-a')
    const monitor=await import('@/services/research/monitorClient')
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({rules:[]}),{headers:{'content-type':'application/json'}}))
    await monitor.readMonitor()
    expect(fetcher.mock.calls.at(-1)?.[0]).toContain('/api/cloud/monitor')
    await client.signOut();expect(client.cloudSnapshot().user).toBeNull()
  })
})
