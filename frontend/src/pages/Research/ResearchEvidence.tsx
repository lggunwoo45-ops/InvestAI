import { type ResearchSnapshot } from '@/services/research/researchModel'
import { researchSourceInfo, sourceMessage } from './researchSourceInfo'
import { researchModes, type ResearchMode } from './researchExperience'
import styles from './ResearchPage.module.css'

export function ResearchEvidence({ snapshot, now, onMode }: { snapshot: ResearchSnapshot | null; now: number; onMode: (mode: ResearchMode) => void }) {
  return <details className={styles.evidence}><summary>자료 출처·갱신 시각 확인</summary><p>각 값의 출처와 사용 위치입니다. 연결 여부만으로 값의 정확성이나 매매 방향을 판단하지 않습니다. 실제 계산에 필요한 값이 빠지면 해당 도구에서 확인 불가로 표시합니다.</p>
    {!snapshot ? <p>출처를 확인할 자료가 없습니다. 새로고침 후 다시 확인해주세요.</p> : <div className={styles.tableWrap}><table className={styles.evidenceTable}><thead><tr><th>자료</th><th>제공처·수집 시각</th><th>자료 상태</th><th>사용 위치</th></tr></thead><tbody>{Object.entries(snapshot.sources).map(([key, source]) => {
      const info = researchSourceInfo[key], usage = info ? [info.title, info.mode] as const : undefined, message = sourceMessage(snapshot, key, now)
      return <tr key={key}><td data-label="자료">{usage?.[0] ?? source.source}<br /><small>{researchSourceInfo[key]?.cadence}</small></td><td data-label="제공처·시각">{source.source}<br /><small>{source.receivedAt ? new Date(source.receivedAt).toLocaleString('ko-KR') : '수집 시각 없음'}</small></td><td data-label="자료 상태"><strong>{message.label}</strong><p>{message.reason}</p><small>{message.next}</small></td><td data-label="사용 위치">{usage ? <button onClick={() => onMode(usage[1])}>{researchModes.find(([mode]) => mode === usage[1])?.[1]} →</button> : '연결된 도구에서 확인'}</td></tr>
    })}</tbody></table></div>}
  </details>
}
