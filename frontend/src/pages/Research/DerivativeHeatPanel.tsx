import type { DerivativesHistory } from '@/services/research/derivativesHistory'
import { derivativeHeat, HEAT_METHOD } from '@/services/research/derivativeHeat'
import styles from './DerivativeHistory.module.css'
export function DerivativeHeatPanel({ data, simple, now, unavailable }: { data: DerivativesHistory; simple: boolean; now: number; unavailable: boolean }) {
  return <section className={styles.heat} aria-label="기간별 과열 참고 지표">
    <header><span className={styles.eyebrow}>최근 {data.days}일 비교</span><h3>{simple ? '평소보다 쏠림이 커졌을까요?' : '기간별 과열 참고 지표'}</h3><p>마지막 관측값이 이전 기록에서 어느 위치인지 각각 비교합니다. 위의 기간을 바꾸면 비교 범위도 바뀝니다.</p></header>
    <div className={styles.heatCards}>{data.series.map(series => {
      const reading = derivativeHeat(series, data.days, now, unavailable), funding = series.metric === 'funding'
      const label = reading.band === 'high' ? '높은 편' : reading.band === 'low' ? '낮은 편' : reading.band === 'usual' ? '중간 범위' : '비교 대기'
      return <article key={series.metric} data-band={reading.band}>
        <h4>{funding ? '펀딩비 크기' : '열린 선물 계약량'}</h4><strong>{label}</strong>
        {reading.percentile !== null ? <><p>{simple ? '이전 기록에서의 상대 위치' : '과거 표본 대비 백분위'} <b>{reading.percentile.toFixed(0)} / 100</b></p><div className={styles.heatScale} role="meter" aria-label={funding ? '펀딩 크기 상대 위치' : '미결제약정 상대 위치'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number(reading.percentile.toFixed(1))} aria-valuetext={`${reading.percentile.toFixed(0)} / 100 · ${label}`}><span style={{ left: `${Math.max(1, Math.min(99, reading.percentile))}%` }} /></div><div className={styles.heatTicks}><span>낮음</span><span>중간</span><span>높음</span></div></> : <p>{reading.reason}</p>}
        <small>실제 확보 {reading.spanDays.toFixed(1)}일 · 이전 표본 {reading.samples.toLocaleString()}개</small>
        {funding && reading.latest !== null && <p>{reading.latest > 0 ? '최근 정산은 롱이 숏에게 지급하는 방향입니다.' : reading.latest < 0 ? '최근 정산은 숏이 롱에게 지급하는 방향입니다.' : '최근 정산 펀딩률은 0입니다.'} 크기 비교에는 부호를 제외합니다.</p>}
        {!funding && <p>계약량이 많다는 뜻이며 가격의 상승·하락 방향을 뜻하지 않습니다.</p>}
        {!simple && <small>기간 확보율 {(reading.coverage * 100).toFixed(0)}%{reading.fundingIntervalHours !== null && ` · 관측된 정산 간격 ${reading.fundingIntervalHours}시간`}</small>}
      </article>
    })}</div>
    <details><summary>비교 기준과 한계</summary><p>현재 값을 제외한 과거 값 중 더 작은 값의 비율을 계산하고, 같은 값은 절반만 반영합니다. 모든 값이 같으면 50입니다. 90 이상은 높은 편, 10 이하는 낮은 편으로 표시하는 서비스 내부 기준입니다. 상승·하락 확률이나 검증된 매매 점수가 아닙니다.</p><p>기간의 90% 이상과 최소 표본(펀딩 14개·계약량 24개)을 확보해야 비교합니다. 펀딩은 기록의 정산 간격이 일정할 때만 절댓값을 비교합니다. 간격 변화와 누락을 구분할 수 없으면 보류합니다. 계약량은 시간별 자료 확보율도 함께 확인합니다.</p><p>Bybit 한 거래소의 현재 저장 버전으로 비교합니다. 과거 시점의 매매 검증에는 사용할 수 없습니다. 7일 자료를 30일·90일·1년 지표로 늘려 표시하지 않으며 두 항목을 합친 종합 점수는 제공하지 않습니다. 기준 {HEAT_METHOD}.</p></details>
  </section>
}
