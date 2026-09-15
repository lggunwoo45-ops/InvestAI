import type { PluginManifest } from '@/types/platform'

export interface PluginService {
  listInstalled(): Promise<readonly PluginManifest[]>
  enable(pluginId: string): Promise<void>
  disable(pluginId: string): Promise<void>
}
