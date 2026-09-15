import { DashboardCard } from '@/components/DashboardCard/DashboardCard'
import { EmptyState } from '@/components/EmptyState/EmptyState'
import { TextAction } from '@/components/TextAction/TextAction'

export function LatestNewsCard() {
  return (
    <DashboardCard title="Latest News" eyebrow="Market feed" icon="news" action={<TextAction label="View all" disabled />}>
      <EmptyState title="No news feed connected" description="Curated market news will appear here when a source is configured." />
    </DashboardCard>
  )
}
