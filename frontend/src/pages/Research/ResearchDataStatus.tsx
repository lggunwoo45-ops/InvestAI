import type { ResearchSnapshot } from '@/services/research/researchModel'
import { sourceMessage } from './researchSourceInfo'
import styles from './ResearchDataStatus.module.css'

export function SourceIssue({ snapshot, sourceKey, now, fallback, readyLabel = '계산 자료 부족' }: { snapshot: ResearchSnapshot | null; sourceKey: string; now: number; fallback?: string; readyLabel?: string }) {
  const message = sourceMessage(snapshot, sourceKey, now)
  return <p className={styles.issue}><b>{message.state === 'ready' ? readyLabel : message.label}</b>{message.state === 'ready' ? fallback ?? '응답은 있지만 이 값에 필요한 항목이나 표본이 부족합니다. 표시된 계산 기준을 확인하세요.' : `${message.reason} ${message.next}`}</p>
}
export function ResearchDataStatus({ snapshot, now, loading, error, auto, onRefresh, onAuto }: { snapshot: ResearchSnapshot | null; now: number; loading: boolean; error: string; auto: boolean; onRefresh: () => void; onAuto: () => void }) {
  const rows = snapshot ? Object.keys(snapshot.sources).map(key => sourceMessage(snapshot, key, now)) : []
  const ready = rows.filter(row => row.state === 'ready').length
  return <section className={styles.status} aria-label="시장 자료 갱신 안내">
    <div><strong>{loading ? snapshot ? '기존 자료를 유지하며 새 자료 확인 중' : '첫 자료를 불러오는 중' : error ? '최근 조회를 완료하지 못했어요' : ready === rows.length ? '시장 요약 자료 확인 완료' : `${rows.length - ready}개 자료는 추가 확인이 필요해요`}</strong>{error && <p>{error} {snapshot ? '아래는 마지막 수집 자료이며, 오래된 값은 계산에서 제외합니다.' : '직접 입력 계산과 저장 기록은 계속 사용할 수 있습니다.'}</p>}<small className={styles.stamp}>{snapshot ? `마지막 수집 ${new Date(snapshot.fetchedAt).toLocaleString('ko-KR')}` : '수집이 끝나면 출처와 시각을 표시합니다.'}</small></div>
    <div className={styles.actions}><span>{auto ? '화면을 보는 동안 1분마다 자동 확인' : '자동 갱신 꺼짐 · 시간이 지나면 값이 만료됩니다'}</span>{!auto && <button onClick={onAuto}>자동 갱신 켜기</button>}<button onClick={onRefresh} disabled={loading}>{loading ? '확인 중…' : '시장 자료 다시 확인'}</button></div>
  </section>
}
