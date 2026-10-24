import { Link } from 'react-router-dom'
import styles from './ResearchPage.module.css'

export function LocalMonitorNotice({ kind = 'all', asset = 'BTC' }: { kind?: 'all' | 'positions' | 'signals'; asset?: string }) {
  return <section className={styles.panel} aria-label="이 웹사이트에서 사용할 수 있는 기능">
    <span className={styles.eyebrow}>웹에서 이용 중</span>
    <h3>{kind === 'positions' ? '내 포지션을 직접 입력해 비교해보세요' : kind === 'signals' ? '찾은 조건을 저장하고 다시 살펴보세요' : '화면을 켜둔 동안 가격 알림을 받을 수 있어요'}</h3>
    <p>{kind === 'positions' ? '아래에서 예상 손익을 계산하거나 공개 지갑의 현재 포지션을 한 번 조회할 수 있어요.' : kind === 'signals' ? '신호 조합 저장·공유와 과거 구간 검증은 이 웹사이트에서 이용할 수 있어요.' : '아래에서 가격 조건을 설정하세요. 검토 메모와 신호 조합도 이 브라우저에 저장할 수 있어요.'}</p>
    <details><summary>계좌 자동 연결·지속 감시는 PC 전용이에요</summary>
      <p>거래소 API 연결, 화면을 닫은 뒤의 지속 감시, 감시 결과 기록과 Telegram 알림은 현재 PC용 InvestAI에서만 지원합니다. 공개 웹사이트에는 사용자별 계좌 보관함이 아직 연결되지 않았어요.</p>
      <p>PC에서 만든 연결과 감시 기록은 이 웹사이트와 동기화되지 않습니다.</p>
    </details>
    {kind === 'all' && <div className={styles.actions}><Link to={`/research?asset=${asset}&mode=setups`}>신호 조건 탐색하기 →</Link><Link to={`/research?asset=${asset}&mode=journal`}>검토 기록 남기기 →</Link></div>}
  </section>
}
