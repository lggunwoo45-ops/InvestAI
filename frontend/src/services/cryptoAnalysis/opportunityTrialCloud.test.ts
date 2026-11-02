import {beforeEach,expect,it,vi} from 'vitest'
import {opportunityNow,opportunityResult} from '@/test/opportunityFixtures'
import {trialFixture} from '@/test/opportunityTrialFixtures'
const context=vi.hoisted(()=>({user:{id:'alice'} as {id:string}|null,generation:1,available:true}))
vi.mock('@/services/cloud/cloudClient',()=>({cloudSnapshot:()=>({user:context.user,opportunityTrialsAvailable:context.available}),cloudSessionGeneration:()=>context.generation,cloudRequest:vi.fn()}))
import {cloudRequest} from '@/services/cloud/cloudClient'
import {readServerTrials,refreshServerTrials,submitOpportunityBatch} from './opportunityTrialCloud'
import {readOpportunityTrials,trialStorageKey} from './opportunityTrialStorage'
beforeEach(()=>{vi.clearAllMocks();localStorage.clear();context.user={id:'alice'};context.generation++;context.available=true})
it('stores member plans remotely and preserves older local records without uploading them',async()=>{
  const t=trialFixture(),raw=JSON.stringify({version:1,trials:[t]});localStorage.setItem(trialStorageKey(),raw)
  vi.mocked(cloudRequest).mockResolvedValue({version:1,asOf:opportunityNow,trials:[t],added:1,duplicates:0})
  expect(await submitOpportunityBatch([opportunityResult()],.2,opportunityNow)).toMatchObject({added:1,source:'server'})
  expect(cloudRequest).toHaveBeenCalledWith('/opportunities',{trials:[expect.objectContaining({evidence:[],checkedAt:null,issue:null})]})
  expect(localStorage.getItem(trialStorageKey())).toBe(raw)
  expect(readServerTrials().trials).toHaveLength(1)
})
it('never silently stores locally on a member failure and leaves guest recording available',async()=>{
  vi.mocked(cloudRequest).mockRejectedValue(Error('offline'))
  await expect(submitOpportunityBatch([opportunityResult()],.2,opportunityNow)).rejects.toThrow('offline')
  expect(readOpportunityTrials().trials).toHaveLength(0)
  context.available=false
  await expect(submitOpportunityBatch([opportunityResult()],.2,opportunityNow)).rejects.toThrow('아직 준비')
  context.user=null;context.generation++
  expect(await submitOpportunityBatch([opportunityResult()],.2,opportunityNow)).toMatchObject({added:1,source:'local'})
  expect(readOpportunityTrials().trials).toHaveLength(1)
})
it('ignores late replies across account switches, including signing back into the original account',async()=>{
  let resolve!:(r:unknown)=>void
  vi.mocked(cloudRequest).mockReturnValue(new Promise(r=>{resolve=r}))
  const request=refreshServerTrials()
  context.user={id:'bobby'};context.generation++
  expect(readServerTrials().trials).toHaveLength(0)
  context.user={id:'alice'};context.generation++
  resolve({version:1,asOf:opportunityNow,trials:[trialFixture()]})
  await request;expect(readServerTrials().trials).toHaveLength(0)
})
it('keeps the last server snapshot when refresh fails or an older reply arrives',async()=>{
  const t=trialFixture()
  vi.mocked(cloudRequest).mockResolvedValue({version:1,asOf:opportunityNow,trials:[t]})
  await refreshServerTrials()
  vi.mocked(cloudRequest).mockResolvedValue({version:1,asOf:opportunityNow-1,trials:[]})
  await refreshServerTrials();expect(readServerTrials().trials).toHaveLength(1)
  vi.mocked(cloudRequest).mockRejectedValue(Error('offline'))
  await expect(refreshServerTrials()).rejects.toThrow('offline')
  expect(readServerTrials()).toMatchObject({error:true,trials:[t],asOf:opportunityNow})
})
