import { researchStorage } from '@/services/cloud/cloudClient'
import { ETF_KEY, validEtfLedger, type EtfLedger } from '../../../../backend/research/etfLedger.mjs'
export * from '../../../../backend/research/etfLedger.mjs'
export function readEtfLedger(storage = researchStorage): EtfLedger {
  const raw = storage.getItem(ETF_KEY)
  if (!raw) return { version: 1, rows: [] }
  const value: unknown = JSON.parse(raw)
  if (!validEtfLedger(value)) throw new Error('저장된 ETF 기록 형식을 확인할 수 없어 덮어쓰지 않았어요.')
  return value
}
export function saveEtfLedger(value: EtfLedger, storage = researchStorage) {
  const raw = JSON.stringify(value)
  if (!validEtfLedger(value) || new TextEncoder().encode(raw).length > 500000) throw new Error('기록 용량을 초과했습니다. 먼저 원본을 내려받아 보관해주세요.')
  storage.setItem(ETF_KEY, raw)
}
