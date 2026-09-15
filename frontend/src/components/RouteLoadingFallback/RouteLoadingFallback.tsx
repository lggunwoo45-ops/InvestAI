import styles from './RouteLoadingFallback.module.css'

export function RouteLoadingFallback() {
  return <div className={styles.loading} role="status"><span /><p>Loading workspace</p></div>
}
