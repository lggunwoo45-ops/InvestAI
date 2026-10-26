import { useState } from 'react'
import type { ResearchHistory } from '@/services/research/researchClient'
import { hasDerivativeFilters, type DerivativeContextPoint, type ExplorerConfig } from '@/services/research/signalExplorer'
import { validateSignalHistory, validValidationCosts, type SignalValidationReport, type ValidationStats } from '@/services/research/signalValidation'
import styles from './SignalValidation.module.css'

interface Props { history?: ResearchHistory; config: ExplorerConfig; contexts?: ReadonlyMap<number, DerivativeContextPoint>; simple: boolean; loading: boolean }
const pct = (n: number | null) => n === null ? '—' : `${n.toFixed(2)}%`
const date = (n: number) => new Date(n).toLocaleString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
const range = (a: number | null, b: number | null) => a === null || b === null ? '—' : Math.abs(a - b) < .000001 ? pct(a) : `${pct(a)} ~ ${pct(b)}`
function verdict(s: ValidationStats) {
  if (!s.samples) return '뒤 구간에 비교할 사례가 없어요'
  if (s.samples < 30) return '사례가 적어 아직 판단하기 어려워요'
  if (s.meanNetHigh! <= 0) return '뒤 구간에서는 비용을 빼면 평균 손실이에요'
  if (s.meanNetLow! <= 0) return '봉 안의 가격 순서에 따라 결과가 달라져요'
  return '뒤 구간에서도 비용 차감 후 평균은 양수였어요'
}
function download(report: SignalValidationReport) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = `investai-${report.input.history.asset}-validation.json`; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function SignalValidation({ history, config, contexts, simple, loading }: Props) {
  const [fee, setFee] = useState('0.05'), [slippage, setSlippage] = useState('0.05'), [dailyHolding, setDailyHolding] = useState('0')
  const [error, setError] = useState('')
  const configKey = JSON.stringify(config), costKey = JSON.stringify([fee, slippage, dailyHolding])
  const [saved, setSaved] = useState<{ report: SignalValidationReport; history: ResearchHistory; contexts: Props['contexts']; configKey: string; costKey: string } | null>(null)
  const costs = { fee: fee.trim() ? Number(fee) : NaN, slippage: slippage.trim() ? Number(slippage) : NaN, dailyHolding: dailyHolding.trim() ? Number(dailyHolding) : NaN }
  const available = !!history && !loading && (!hasDerivativeFilters(config) || !!contexts)
  const report = saved && available && saved.history === history && saved.configKey === configKey && saved.costKey === costKey && (!hasDerivativeFilters(config) || saved.contexts === contexts) ? saved.report : null
  const run = () => {
    setSaved(null); setError('')
    if (!history || !available) return
    try { setSaved({ report: validateSignalHistory(history, config, costs, contexts), history, contexts, configKey, costKey }) }
    catch (e) { setError(e instanceof Error ? e.message : '검증 조건을 확인해주세요.') }
  }
  const stats = report?.validation.stats
  return <section className={`${styles.panel} ${simple ? styles.simple : ''}`} aria-label="비용·구간 검증">
    <header><span className={styles.eyebrow}>COST & PERIOD CHECK</span><h3>{simple ? '비용을 빼도, 뒤 구간에서도 괜찮았을까요?' : '시간 순서 분리 · 거래비용 검증'}</h3><p>지표 준비 60봉을 제외한 앞 70%와 뒤 30%에 같은 조건을 적용해요. 경계를 넘는 관찰은 제외합니다.</p></header>
    <div className={styles.form}>
      <label>한 번 거래 수수료 (%)<input type="number" min="0" max="5" step="0.01" value={fee} onChange={e => { setFee(e.target.value); setError('') }} /></label>
      <label>불리한 체결 차이 (%)<input type="number" min="0" max="5" step="0.01" value={slippage} onChange={e => { setSlippage(e.target.value); setError('') }} /></label>
    </div>
    <details open={!simple}><summary>추가 보유비용 가정</summary><label className={styles.holding}>하루 보유비용 (%)<input type="number" min="0" max="5" step="0.01" value={dailyHolding} onChange={e => { setDailyHolding(e.target.value); setError('') }} /></label><p>선택 입력이며 실제 펀딩률이 아닙니다. 보유 시간에 비례해 차감하는 비용 가정이에요. 0이면 추가 비용을 빼지 않아요.</p></details>
    <p className={styles.basis}>수수료와 체결 차이는 진입·청산 양쪽에 적용합니다. 위 숫자는 수정 가능한 예시이며, 기존 탐색의 왕복 비용과 중복 차감하지 않아요. 실제 펀딩 정산·레버리지·청산은 반영하지 않습니다.</p>
    <button className={styles.run} disabled={!available || !validValidationCosts(costs)} onClick={run}>이 조건으로 구간 검증하기</button>
    {!available && <p role="status">가격 기록과 선택한 추가 지표가 준비되면 실행할 수 있어요.</p>}
    {!validValidationCosts(costs) && <p role="alert">비용은 빈칸 없이 0~5%로 입력해주세요.</p>}
    {error && <p role="alert">{error}</p>}
    {saved && !report && <p role="status">조건·비용 또는 시세 자료가 바뀌었어요. 다시 실행하면 새 기준으로 비교합니다.</p>}
    {report && stats && <div className={styles.report}>
      <div className={styles.conclusion}><small>뒤 30% 구간 · 완료 사례 {stats.samples}건</small><h4>{verdict(stats)}</h4><p>{stats.samples < 30 ? '30건은 참고용 표본 안내 기준일 뿐이에요. 기록이 더 쌓인 뒤 다시 비교하세요.' : '기간을 나눈 관측 결과이며 매수 추천이나 앞으로의 수익 확률은 아니에요.'}</p></div>
      <div className={styles.metrics}><div><span>비용 차감 후 평균 변화</span><strong>{range(stats.meanNetLow, stats.meanNetHigh)}</strong><small>사례별 진입 금액 대비 · 누적 수익률 아님</small></div><div><span>비용 차감 전 평균 변화</span><strong>{range(stats.meanGrossLow, stats.meanGrossHigh)}</strong><small>같은 사례에 적용한 가격 변화</small></div></div>
      <div className={styles.comparison}>{[['앞 70% 비교 구간', report.training], ['뒤 30% 검증 구간', report.validation]].map(([title, value]) => {
        const part = value as SignalValidationReport['training']
        return <article key={String(title)}><h4>{String(title)}</h4><p>{date(part.from)} – {date(part.to)}</p><b>{range(part.stats.meanNetLow, part.stats.meanNetHigh)}</b><span>비용 차감 후 평균 · {part.stats.samples}건</span><small>양쪽 도달 {part.stats.ambiguous}건 · 자료 공백 {part.gaps}건 · {title === '앞 70% 비교 구간' ? '경계 넘어 제외' : '관찰 미완료'} {part.incomplete}건 · 파생 자료 부족 {part.unknown}건</small></article>
      })}</div>
      {stats.ambiguous > 0 && <p className={styles.caution}>양쪽 가격에 같은 봉에서 닿은 {stats.ambiguous}건도 포함했어요. 먼저 손실 기준에 닿은 경우부터 목표에 닿은 경우까지 범위로 표시합니다.</p>}
      <p className={styles.caution}>전체 차트나 뒤 구간 결과를 본 뒤 조건을 바꿨다면 독립 검증이 아닙니다. 실제 사용 전에는 조건을 고정하고 이후에 새로 쌓이는 기록도 확인해야 해요.</p>
      <details open={!simple}><summary>구간별 결과와 계산 근거</summary>
        <div className={styles.periods}>{report.periods.map((p, i) => <article key={p.from}><b>뒤 구간 {i + 1} / 3</b><span>{date(p.from)} – {date(p.to)}</span><strong>{range(p.stats.meanNetLow, p.stats.meanNetHigh)}</strong><span>{p.stats.samples}건 · 양쪽 도달 {p.stats.ambiguous}건</span></article>)}</div>
        <p>세부 구간은 신호 발생 시각으로 나눈 같은 검증 사례의 요약입니다. 앞 구간은 지표 준비 이후부터 시작해요. 평균은 모든 사례를 같은 비중으로 계산합니다.</p>
        <p>수익이 양수인 사례 {stats.positiveLow}~{stats.positiveHigh} / {stats.samples}건 · 가장 불리했던 단일 사례 {pct(stats.worstNet)}. 계좌 수익률·최대 낙폭·예측 정확도가 아닙니다.</p>
        <p>완료 봉에서 신호를 확인한 다음 봉 시가로 진입합니다. 가격 폭은 체결 차이를 반영하기 전 진입 가격이 기준입니다. 관찰 기간은 겹치지 않게 잡고, 갭으로 기준 가격을 넘으면 시가로 계산해요.</p>
        <p>진입 가격은 불리하게, 청산 가격도 불리하게 조정하고 각 체결 금액에 수수료를 적용합니다. 하루 보유비용은 {report.input.costs.dailyHolding}% 가정이며, 봉 안의 종료 시각은 알 수 없어 해당 봉 끝까지 부과합니다. 기존 탐색 비용 {report.input.config.cost}%는 이 결과에서 사용하지 않습니다.</p>
        <p>{report.input.history.source} · {report.input.history.candles.length.toLocaleString()}개 완료 봉 · {report.signalVersion} · {report.version}{report.derivativeVersion ? ` · ${report.derivativeVersion} · 추가 조건 Bybit USDT perpetual` : ''}</p>
        <div className={styles.table}><table><caption>뒤 구간 최근 30건</caption><thead><tr><th>신호 발생</th><th>결과</th><th>비용 차감 후</th></tr></thead><tbody>{report.validation.trades.slice(-30).reverse().map(t => <tr key={t.signalAt}><td>{date(t.signalAt)}</td><td>{{ up: '상단 도달', down: '하단 도달', timeout: '기간 종료', ambiguous: '양쪽·순서 불명' }[t.outcome]}</td><td>{range(t.netLow, t.netHigh)}</td></tr>)}</tbody></table></div>
      </details>
      <div className={styles.export}><button onClick={() => download(report)}>검증 기록 다운로드</button><small>가격 기록·조건·비용·결과를 함께 저장합니다. 개인 계정·보유 정보는 포함하지 않아요.</small></div>
    </div>}
  </section>
}
