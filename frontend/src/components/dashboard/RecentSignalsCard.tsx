import { DashboardCard } from '@/components/DashboardCard/DashboardCard'
import { EmptyState } from '@/components/EmptyState/EmptyState'
import { TextAction } from '@/components/TextAction/TextAction'

export function RecentSignalsCard() {
  return (
    <DashboardCard title="Recent Signals" eyebrow="Strategy engine" icon="strategies" action={<TextAction label="History" disabled />}>
      <EmptyState title="No signals generated" description="Validated strategy signals will be recorded here with full provenance." />
    </DashboardCard>
  )
}
