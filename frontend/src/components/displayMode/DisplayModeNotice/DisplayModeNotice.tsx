import type { PropsWithChildren } from 'react'

import styles from './DisplayModeNotice.module.css'

export function DisplayModeNotice({ children }: PropsWithChildren) {
  return <aside className={styles.notice} role="note">{children}</aside>
}
