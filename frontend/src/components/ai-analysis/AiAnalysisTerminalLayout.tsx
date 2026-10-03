import type { ReactNode } from 'react'
import styles from './AiAnalysisTerminalLayout.module.css'

interface AiAnalysisTerminalLayoutProps {
  header: ReactNode
  tabs: ReactNode
  context: ReactNode
  advanced?: ReactNode
  candidateList: ReactNode
  inspector: ReactNode
}

export function AiAnalysisTerminalLayout({ header, tabs, context, advanced, candidateList, inspector }: AiAnalysisTerminalLayoutProps) {
  return <div className={styles.terminal} data-ai-analysis-terminal>
    {header}
    {tabs}
    {context}
    {advanced}
    <div className={styles.workspace}><div className={styles.list}>{candidateList}</div><div className={styles.inspector}>{inspector}</div></div>
  </div>
}
