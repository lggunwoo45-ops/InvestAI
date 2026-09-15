import type { IconName } from '@/components/Icon/Icon'
import { Icon } from '@/components/Icon/Icon'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import styles from './PagePlaceholder.module.css'

interface PagePlaceholderProps {
  title: string
  description: string
  icon: IconName
  capabilities: readonly string[]
}

export function PagePlaceholder({ title, description, icon, capabilities }: PagePlaceholderProps) {
  useDocumentTitle(title)

  return (
    <div className={styles.page}>
      <header className={styles.heading}><span>Workspace module</span><h1>{title}</h1><p>{description}</p></header>
      <section className={styles.module}>
        <div className={styles.moduleHeader}><span className={styles.icon}><Icon name={icon} size={18} /></span><div><strong>Module foundation</strong><small>Implementation boundary established</small></div><span className={styles.badge}>Planned</span></div>
        <div className={styles.capabilities}>
          {capabilities.map((capability) => <div key={capability}><span /><p>{capability}</p><small>Future capability</small></div>)}
        </div>
      </section>
    </div>
  )
}
