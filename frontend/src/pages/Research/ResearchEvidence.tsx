import { sourceData, type ResearchSnapshot } from '@/services/research/researchModel'
import { researchModes, type ResearchMode } from './researchExperience'
import styles from './ResearchPage.module.css'

const uses: Record<string, [string, ResearchMode]> = {
  mark: ['기준 가격·현재 펀딩', 'overview'], candles: ['시간별 가격·거래량', 'overview'],
  interest: ['미결제약정', 'indicators'], interestHistory: ['미결제약정 이력', 'indicators'], ratios: ['롱/숏 계정 비율', 'indicators'], taker: ['매수/매도 거래량', 'indicators'],
  sentiment: ['공포·탐욕 지수', 'indicators'], global: ['시가총액 비중', 'indicators'],
  fundingInfo: ['펀딩 정산 간격', 'costs'], fundingHistory: ['확정 펀딩 이력', 'costs'],
  spot: ['해외 현물 가격', 'premium'], futures: ['해외 선물 거래대금', 'indicators'], korea: ['업비트 가격', 'premium'],
  bybit: ['Bybit 펀딩', 'costs'], okx: ['OKX 펀딩', 'costs'], bitget: ['Bitget 펀딩', 'costs'], hyperliquid: ['Hyperliquid 펀딩', 'costs'],
  koreaAll: ['국내 가격 비교', 'premium'], spotAll: ['해외 가격 비교', 'premium'],
}

export function ResearchEvidence({ snapshot, now, onMode }: { snapshot: ResearchSnapshot | null; now: number; onMode: (mode: ResearchMode) => void }) {
  return <details className={styles.evidence}><summary>자료 출처·갱신 시각 확인</summary><p>각 값의 출처와 사용 위치입니다. 연결 여부만으로 값의 정확성이나 매매 방향을 판단하지 않습니다. 실제 계산에 필요한 값이 빠지면 해당 도구에서 확인 불가로 표시합니다.</p>
    {!snapshot ? <p>출처를 확인할 자료가 없습니다. 새로고침 후 다시 확인해주세요.</p> : <div className={styles.tableWrap}><table><thead><tr><th>자료</th><th>제공처·수집 시각</th><th>자료 상태</th><th>사용 위치</th></tr></thead><tbody>{Object.entries(snapshot.sources).map(([key, source]) => {
      const usage = uses[key]
      return <tr key={key}><td>{usage?.[0] ?? source.source}</td><td>{source.source}<br /><small>{source.receivedAt ? new Date(source.receivedAt).toLocaleString('ko-KR') : '수집 시각 없음'}</small></td><td>{sourceData(snapshot, key, now) === null ? '자료 없음·갱신 필요' : '자료 확보 · 개별 값 확인 필요'}</td><td>{usage ? <button onClick={() => onMode(usage[1])}>{researchModes.find(([mode]) => mode === usage[1])?.[1]} →</button> : '연결된 도구에서 확인'}</td></tr>
    })}</tbody></table></div>}
  </details>
}
