import { evaluateOpportunityTrial, summarizeOpportunityTrials, TRIAL_HOUR, type OpportunityTrial, type TrialState } from './opportunityTrials'
import type { OpportunityKind } from './opportunityEngine'

export const opportunityKinds: readonly OpportunityKind[] = ['pullback', 'breakout', 'rebound']
export type ReportPeriod = 'all' | '7' | '30' | '90'
export type ReportMarket = 'all' | 'upbit-KRW' | 'upbit-BTC' | 'upbit-USDT' | 'binance-spot'
export interface OpportunityReportFilter { period: ReportPeriod; market: ReportMarket; kind: 'all' | OpportunityKind }
export const defaultReportFilter: OpportunityReportFilter = { period: 'all', market: 'all', kind: 'all' }

/** Filter by when the plan was recorded, never by its profitable/unprofitable outcome. */
export function opportunityReport(trials: readonly OpportunityTrial[], asOf: number, filter: OpportunityReportFilter) {
  const since = filter.period === 'all' ? -Infinity : asOf - Number(filter.period) * 24 * TRIAL_HOUR
  const marketRecords = trials.filter(t => t.recordedAt >= since && t.recordedAt <= asOf &&
    (filter.market === 'all' || (t.instrument.marketId === 'upbit' ? `upbit-${t.instrument.quoteCurrency}` : t.instrument.marketId) === filter.market))
  const records = marketRecords.filter(t => filter.kind === 'all' || t.kind === filter.kind)
    .toSorted((a,b) => b.recordedAt - a.recordedAt || a.id.localeCompare(b.id))
  const rows = records.map(trial => ({ trial, outcome: evaluateOpportunityTrial(trial, asOf) }))
  const counts = Object.fromEntries((['pending','open','target','stop','timeout','ambiguous','skipped','unresolved'] as TrialState[])
    .map(state => [state, rows.filter(r => r.outcome.state === state).length])) as Record<TrialState, number>
  return { records, rows, counts, summary: summarizeOpportunityTrials(records, asOf),
    strategies: opportunityKinds.map(kind => ({ kind, summary: summarizeOpportunityTrials(marketRecords, asOf, kind) })) }
}

// Quote every text field and neutralize spreadsheet formulas from imported names/IDs.
const csvCell = (value: string | number | null) => {
  if (value === null) return ''
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  const first = [...value].find(char => char.charCodeAt(0) > 32 && !/\s/.test(char))
  const safe = first && '=+@-'.includes(first) ? `'${value}` : value
  return `"${safe.replaceAll('"','""')}"`
}
/** Exports every state in the selected cohort, regardless of the list's outcome filter. */
export function opportunityReportCsv(trials: readonly OpportunityTrial[], asOf: number, filter: OpportunityReportFilter, source: 'server' | 'local') {
  const report = opportunityReport(trials, asOf, filter)
  const header = ['record_id','source','as_of_utc','period_days','market_filter','strategy_filter','recorded_at_utc','exchange','symbol','quote_currency','strategy','state','entry_low','entry_high','stop','target','cost_percent','modeled_entry','modeled_exit','net_low_percent','net_high_percent','outcome_at_utc','completed_bars','evidence_issue']
  const rows = report.rows.map(({trial:t,outcome:o}) => [t.id,source,new Date(asOf).toISOString(),filter.period,filter.market,filter.kind,
    new Date(t.recordedAt).toISOString(),t.instrument.marketId,t.instrument.symbol,t.instrument.quoteCurrency,t.kind,o.state,
    t.entry[0],t.entry[1],t.stop,t.target,t.costPercent,o.entry,o.exit,o.netLow,o.netHigh,o.at===null?null:new Date(o.at).toISOString(),o.bars,t.issue] as (string|number|null)[])
  return '\ufeff' + [header,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
