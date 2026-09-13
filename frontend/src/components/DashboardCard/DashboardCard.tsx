import type { PropsWithChildren, ReactNode } from 'react'

import type { IconName } from '@/components/Icon/Icon'
import { Icon } from '@/components/Icon/Icon'
import { classNames } from '@/utils/classNames'
import styles from './DashboardCard.module.css'

interface DashboardCardProps extends PropsWithChildren {
  title: string
  eyebrow?: string
  icon: IconName
  action?: ReactNode
  className?: string
}

export function DashboardCard({ title, eyebrow, icon, action, className, children }: DashboardCardProps) {
  return (
    <article className={classNames(styles.card, className)}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.icon}><Icon name={icon} size={15} /></span>
          <div>{eyebrow && <span>{eyebrow}</span>}<h2>{title}</h2></div>
        </div>
        {action}
      </header>
      <div className={styles.content}>{children}</div>
    </article>
  )
}
