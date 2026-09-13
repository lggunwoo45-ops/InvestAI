import { PagePlaceholder } from '@/components/PagePlaceholder/PagePlaceholder'

export function SettingsPage() {
  return <PagePlaceholder title="Settings" description="Providers, plugins, access controls, and workspace policy." icon="settings" capabilities={['Provider credentials', 'Plugin permissions', 'Security & audit policy']} />
}
