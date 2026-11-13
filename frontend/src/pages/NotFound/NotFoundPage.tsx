import { Link } from 'react-router-dom'

import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import styles from './NotFoundPage.module.css'

export function NotFoundPage() {
  useDocumentTitle('Not Found')
  return <div className={styles.page}><span>404</span><h1>Workspace not found</h1><p>The requested Market Copilot module does not exist.</p><Link to="/market">Return to Market</Link></div>
}
