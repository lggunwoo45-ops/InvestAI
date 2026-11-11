import { Component, type ErrorInfo, type PropsWithChildren } from 'react'

import styles from './AppErrorBoundary.module.css'

interface AppErrorBoundaryState {
  hasError: boolean
}

export class AppErrorBoundary extends Component<PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Replace with the platform telemetry adapter when observability is introduced.
    console.error('InvestAI render failure', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className={styles.fallback}>
          <span>Application recovery</span>
          <h1>InvestAI could not render this workspace.</h1>
          <p>Reload the application. No trading action was submitted.</p>
          <button type="button" onClick={() => window.location.reload()}>Reload workspace</button>
        </main>
      )
    }

    return this.props.children
  }
}
