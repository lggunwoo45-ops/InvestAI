import { researchStorage } from '@/services/cloud/cloudClient'
import { researchAssets } from './researchModel'
import { defaultExplorerConfig, validExplorerConfig, type ExplorerConfig } from './signalExplorer'
export interface ExplorerPreset { id: string; name: string; asset: string; at: number; config: ExplorerConfig }
const key = 'investai.signal-presets.v1'
export function readExplorerPresets(): ExplorerPreset[] {
  const raw = researchStorage.getItem(key)
  if (!raw) return []
  const rows = JSON.parse(raw)
  if (!Array.isArray(rows) || rows.length > 24 || rows.some(p => !p || typeof p.id !== 'string' || typeof p.name !== 'string' || p.name.length > 60 || !researchAssets.some(a => a === p.asset) || !Number.isFinite(p.at) || !validExplorerConfig(p.config))) throw new Error('저장한 조건을 읽을 수 없습니다. 기존 자료는 보존했습니다.')
  return rows
}
export function saveExplorerPreset(preset: ExplorerPreset) {
  if (!validExplorerConfig(preset.config) || !preset.name.trim() || preset.name.length > 60 || !researchAssets.some(a => a === preset.asset)) throw new Error('저장할 이름과 조건을 확인해주세요.')
  const previous = readExplorerPresets()
  if (previous.length >= 24) throw new Error('조건은 24개까지 저장할 수 있습니다. 사용하지 않는 조건을 먼저 삭제해주세요.')
  const next = [...previous, structuredClone(preset)]
  researchStorage.setItem(key, JSON.stringify(next)); return next
}
export function createExplorerPreset(input: Pick<ExplorerPreset, 'asset' | 'name' | 'config'>) { return saveExplorerPreset({ ...input, id: crypto.randomUUID(), at: Date.now() }) }
export function removeExplorerPreset(id: string) { const next = readExplorerPresets().filter(p => p.id !== id); researchStorage.setItem(key, JSON.stringify(next)); return next }
export function configFromQuery(params: URLSearchParams): ExplorerConfig {
  const raw = params.get('config')
  if (raw && raw.length < 5000) { try { const config = JSON.parse(raw); if (validExplorerConfig(config)) return config } catch { /* Invalid links do not alter stored conditions. */ } }
  return structuredClone(defaultExplorerConfig)
}
export function explorerLink(asset: string, config: ExplorerConfig): string {
  const url = new URL(window.location.href)
  url.search = new URLSearchParams({ asset, mode: 'setups', config: JSON.stringify(config) }).toString(); url.hash = ''
  return url.href
}
