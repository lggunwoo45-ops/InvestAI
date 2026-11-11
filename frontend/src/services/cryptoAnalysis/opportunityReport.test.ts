import {describe,expect,it} from 'vitest'
import {trialBars,trialFixture} from '@/test/opportunityTrialFixtures'
import {mergeTrialEvidence,TRIAL_HOUR as H,type OpportunityTrial} from './opportunityTrials'
import {defaultReportFilter,opportunityReport,opportunityReportCsv} from './opportunityReport'

const shift=(t:OpportunityTrial,hours:number):OpportunityTrial=>({...t,recordedAt:t.recordedAt+hours*H,signalAt:t.signalAt+hours*H,signalCandleAt:t.signalCandleAt+hours*H,startAt:t.startAt+hours*H,basis:t.basis.map(b=>({...b,asOf:b.asOf+hours*H}))})
describe('Forward review cohorts',()=>{
  it('filters by recording time with an inclusive boundary and keeps market/quote identities separate',()=>{
    const t=trialFixture(),asOf=t.recordedAt+7*24*H
    const old={...shift(t,-1),id:'old'},future={...shift(t,7*24+1),id:'future'}
    const usdt={...t,id:'usdt',instrument:{...t.instrument,id:'upbit-usdt-sol',symbol:'SOL/USDT',quoteCurrency:'USDT'}}
    const input=[old,t,usdt,future],before=JSON.stringify(input)
    const report=opportunityReport(input,asOf,{...defaultReportFilter,period:'7',market:'upbit-KRW'})
    expect(report.records.map(r=>r.id)).toEqual([t.id])
    expect(opportunityReport(input,asOf,{...defaultReportFilter,period:'7',market:'upbit-USDT'}).records.map(r=>r.id)).toEqual(['usdt'])
    expect(JSON.stringify(input)).toBe(before)
  })
  it('keeps ambiguous outcomes as ranges, missing evidence separate, and comparison independent of strategy selection',()=>{
    const t=trialFixture(),b=trialBars(t)[0],now=t.startAt+H
    const win=mergeTrialEvidence({...t,id:'win',kind:'breakout'},[{...b,high:t.target}],now)
    const loss=mergeTrialEvidence({...t,id:'loss',kind:'pullback'},[{...b,low:t.stop}],now)
    const ambiguous=mergeTrialEvidence({...t,id:'ambiguous'},[{...b,low:t.stop,high:t.target}],now)
    const missing={...t,id:'missing'}
    const report=opportunityReport([win,loss,ambiguous,missing],now,defaultReportFilter)
    expect(report.summary).toMatchObject({total:4,completed:3,unresolved:1,ambiguous:1})
    expect(report.summary.winsLow).toBeCloseTo(100/3)
    expect(report.summary.winsHigh).toBeCloseTo(200/3)
    expect(report.summary.meanLow!).toBeLessThan(report.summary.meanHigh!)
    const narrowed=opportunityReport([win,loss,ambiguous,missing],now,{...defaultReportFilter,kind:'breakout'})
    expect(narrowed.records.map(r=>r.id)).toEqual(['win'])
    expect(narrowed.strategies).toEqual(report.strategies)
    expect(report.counts).toMatchObject({target:1,stop:1,ambiguous:1,unresolved:1,pending:0})
  })
  it('exports missing/ambiguous cases, source and filters without inventing zero returns',()=>{
    const t=trialFixture(),b=trialBars(t)[0],now=t.startAt+H
    const ambiguous=mergeTrialEvidence(t,[{...b,low:t.stop,high:t.target}],now)
    const csv=opportunityReportCsv([ambiguous,{...t,id:'missing'}],now,{...defaultReportFilter,period:'30'},'server')
    expect(csv.startsWith('\ufeff')).toBe(true)
    expect(csv).toContain('"net_low_percent","net_high_percent"')
    expect(csv).toContain('"server","2026-10-29T14:00:00.000Z","30","all","all"')
    expect(csv).toContain('"ambiguous"')
    expect(csv).toContain('"unresolved"')
    expect(csv.split('\r\n').find(r=>r.startsWith('"missing"'))).toMatch(/,,,,,,0,$/)
  })
  it('escapes names and prevents formula execution while retaining numeric losses',()=>{
    const t=trialFixture(),b=trialBars(t)[0],now=t.startAt+H
    const loss=mergeTrialEvidence({...t,id:'\t=HYPERLINK("external")'},[{...b,low:t.stop}],now)
    const csv=opportunityReportCsv([loss],now,defaultReportFilter,'local')
    expect(csv).toContain('"\'\t=HYPERLINK(""external"")"')
    expect(csv).toMatch(/,-\d/)
    expect(opportunityReportCsv([],now,defaultReportFilter,'local').split('\r\n')).toHaveLength(2)
  })
})
