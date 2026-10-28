export const ETF_KEY: 'investai.etf-ledger.v1'
export interface EtfValue { flow: number; source: string; updatedAt: number }
export interface EtfRow extends EtfValue { asset: 'BTC' | 'ETH'; date: string; revision: number; previous: EtfValue[] }
export interface EtfLedger { version: 1; rows: EtfRow[] }
export function validEtfLedger(data: unknown): data is EtfLedger
export function parseEtfCsv(text: string, now?: number): Pick<EtfRow, 'date' | 'flow' | 'source'>[]
export function mergeEtfRows(data: EtfLedger, asset: 'BTC' | 'ETH', rows: Pick<EtfRow, 'date' | 'flow' | 'source'>[], now?: number): EtfLedger
export function exportEtfCsv(rows: EtfRow[]): string
