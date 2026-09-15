import { DashboardCard } from '@/components/DashboardCard/DashboardCard'
import { WhyPlaceholder } from '@/components/WhyPlaceholder/WhyPlaceholder'
import styles from './AiConfidenceCard.module.css'

export function AiConfidenceCard() {
  return (
    <DashboardCard title="AI Confidence" eyebrow="Explainable intelligence" icon="ai">
      <div className={styles.content}>
        <div className={styles.summary}>
          <div className={styles.ring}><strong>—</strong><span>No model</span></div>
          <p>Confidence is shown only when an AI model can support it with an explanation.</p>
        </div>
        <WhyPlaceholder compact />
      </div>
    </DashboardCard>
  )
}
