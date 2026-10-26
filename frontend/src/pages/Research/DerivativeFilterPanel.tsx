import type { ExplorerConfig, ExplorerResult } from '@/services/research/signalExplorer'
import type { DerivativeContext } from '@/services/research/derivativeContextClient'
import styles from './SignalExplorer.module.css'
export function DerivativeFilterPanel({ simple, config, update, active, data, loading, error, coverage }: { simple: boolean; config: ExplorerConfig; update: (patch: Partial<ExplorerConfig>) => void; active: boolean; data?: DerivativeContext; loading: boolean; error?: string; coverage?: ExplorerResult['derivativeCoverage'] }) {
  const first = data?.firstStoredAt ? new Date(data.firstStoredAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : null
  return <section className={styles.derivativePanel} aria-labelledby="derivative-filter-title">
    <header><div><span className={styles.eyebrow}>BYBIT · 당시 저장 기록</span><h3 id="derivative-filter-title">{simple ? '그때 선물 시장도 비슷했나요?' : '과거 파생 지표로 사례 좁히기'}</h3></div>{active && <button onClick={() => update({ funding: 'any', openInterest: 'any' })}>추가 조건 해제</button>}</header>
    <p>{simple ? '가격 신호에 그때의 펀딩비와 열린 계약의 변화를 더해 비교해요. 두 가지를 고르면 둘 다 맞는 때를 찾습니다.' : '가격 신호는 Binance, 추가 파생 조건은 Bybit USDT 무기한 자료입니다. 조건은 신호 봉의 종료 시각에 함께 평가합니다.'}</p>
    <div className={styles.derivativeFields}><label>{simple ? '펀딩비를 어느 쪽이 냈나요?' : '당시 확정 펀딩률'}<select aria-label="과거 펀딩 조건" value={config.funding ?? 'any'} onChange={e => update({ funding: e.target.value as ExplorerConfig['funding'] })}><option value="any">따로 구분하지 않기</option><option value="positive">{simple ? '롱이 숏에게 낸 때' : '양수 · 0% 초과'}</option><option value="negative">{simple ? '숏이 롱에게 낸 때' : '음수 · 0% 미만'}</option></select></label><label>{simple ? '열린 선물 계약은 달라졌나요?' : '당시 미결제약정 · 24시간 전 대비'}<select aria-label="과거 미결제약정 조건" value={config.openInterest ?? 'any'} onChange={e => update({ openInterest: e.target.value as ExplorerConfig['openInterest'] })}><option value="any">따로 구분하지 않기</option><option value="rising">{simple ? '하루 전보다 늘어난 때' : '증가 · 0% 초과'}</option><option value="falling">{simple ? '하루 전보다 줄어든 때' : '감소 · 0% 미만'}</option></select></label></div>
    {active && <>
      {loading && <p role="status">그 시점까지 저장돼 있던 자료를 확인하고 있어요.</p>}
      {error && <p role="alert" className={styles.derivativeError}>{error} 가격 조건만의 결과로 대신 표시하지 않습니다.</p>}
      {data && coverage && <><div className={styles.derivativeCounts}><div><span>가격 조건 시점</span><strong>{coverage.candidates}개</strong></div><div><span>당시 자료 확인 가능</span><strong>{coverage.available}개</strong></div><div><span>자료 부족으로 제외</span><strong>{coverage.unknown}개</strong></div><div><span>추가 조건까지 충족</span><strong>{coverage.matched}개</strong></div></div><p>{coverage.excluded}개는 자료가 있지만 추가 조건과 맞지 않았어요. 위 숫자는 중복 구간을 제외하기 전이며, 아래 결과는 이후 관찰까지 끝난 비중복 사례입니다.</p></>}
      {data && <p className={styles.derivativeBasis}>{first ? `이 종목의 보관 이력 최초 저장: ${first} (한국 시간).` : '이 종목은 아직 저장된 지표가 없습니다.'} 나중에 받아온 과거 자료는 그 이전 시점의 판단에 쓰지 않습니다. 수집 초기에는 비교할 사례가 적거나 없을 수 있어요.</p>}
    </>}
    <details><summary>추가 지표의 기준과 제공 범위</summary><p>가격 차트는 Binance, 추가 지표는 Bybit 한 거래소 자료입니다. 신호 봉이 끝나기 전에 실제 저장된 버전만 사용하며, 뒤늦은 수집·정정은 과거로 소급하지 않습니다.</p><p>펀딩률은 최근 12시간 이내 정산값만, 미결제약정은 최근 2시간 이내 관측값과 정확히 24시간 전 값을 비교합니다. 이 시간 범위는 조회의 유효기간이며, 실제 정산 간격을 뜻하지 않습니다. 자료가 없거나 너무 오래되면 제외합니다. 증가·감소가 없는 0은 양수·음수 조건에 포함하지 않습니다.</p><p>이번 추가 조건은 과거 사례 비교·조건 저장·공유에 적용됩니다. 자동 신호 감시·청산 조건·실제 펀딩 비용 반영은 아직 포함하지 않습니다.</p></details>
  </section>
}
