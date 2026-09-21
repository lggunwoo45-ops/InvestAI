import type { PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'

import styles from './DisplayModeNotice.module.css'

interface DisplayModeNoticeProps extends PropsWithChildren {
  variant?: 'compact' | 'panel'
  action?: { label: string; to: string }
}

export function DisplayModeNotice({ children, variant = 'compact', action }: DisplayModeNoticeProps) {
  return <aside className={styles.notice} data-variant={variant} role="note"><span>{children}</span>{action && <Link to={action.to}>{action.label} →</Link>}</aside>
}
