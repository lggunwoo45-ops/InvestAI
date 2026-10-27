import type { Language } from '@/i18n/translations'
import type { CryptoDecision, SeriesIssue } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import styles from './CryptoAnalysisHelp.module.css'

const guides = {
  ko: [
    ['1시간·4시간·일봉', '봉 하나가 묶는 시간입니다. 진행 중인 봉은 제외하고 끝난 봉만 비교합니다. 4시간봉은 4시간마다 끝나므로 현재가와 마지막 완료 봉의 가격은 다를 수 있습니다.'],
    ['상승·하락 판단과 이동평균', '각 시간대의 종가와 20·50봉 평균 관계를 비교합니다. 1시간·4시간·일봉에 1·2·3의 비중을 두어 합치며, 유효한 시간대가 2개 미만이면 방향을 판단하지 않습니다. 미래 가격의 확률 예측은 아닙니다.'],
    ['RSI 14', '최근 14봉의 상승·하락 폭을 바탕으로 Wilder 방식으로 계산한 0~100 지표입니다. 70 이상은 최근 상승 쏠림, 30 이하는 하락 쏠림을 살펴볼 기준입니다. 70이라고 상승 확률 70%이거나 즉시 매도해야 한다는 뜻은 아닙니다.'],
    ['평소 대비 거래량', '마지막 완료 봉의 거래량을 직전 20개 완료 봉 평균으로 나눕니다. 1.5배라면 비교 평균보다 50% 많았다는 뜻입니다. 평균이 0이거나 기록이 부족하면 계산하지 않습니다.'],
    ['평균 변동 폭 · ATR', '최근 봉의 고가·저가와 직전 종가 사이의 실제 변동 폭을 평균 낸 가격 단위의 값입니다. ATR 100원이면 최근 한 봉의 변동 폭이 평균 약 100원이었다는 뜻이며 다음 봉의 방향은 알려주지 않습니다.'],
    ['지지·저항 구간', '지지는 내려올 때 멈추는지, 저항은 올라갈 때 막히는지 살펴보는 가격대입니다. 과거 저가·고가에 변동 폭을 더해 구간으로 표시합니다. 관측 저항이 없으면 추정이라고 표시하며, 지지에 닿았다는 이유만으로 매수 신호가 되지는 않습니다.'],
    ['돌파 확인선·추가 하락 주의선', '돌파선은 저항 기준 위에 변동 폭의 여유를, 하락 주의선은 지지 아래에 여유를 둔 기준입니다. 표시된 시간봉이 위·아래로 마감하는 조건을 읽으세요. 순간적인 가격 접촉과 마감은 구분합니다.'],
    ['손익비', '지지 구간 중간값에서 저항까지의 거리 ÷ 하락 주의선까지의 거리입니다. 2:1은 계산상 상승 여지가 하락 위험의 2배라는 뜻입니다. 승률·실제 수익률이 아니며 비용은 빠져 있습니다.'],
    ['큰 체결', '최근 5분 안에 받은 최대 20건 중 상대적으로 큰 체결을 비교합니다. 유효 체결 10건과 큰 체결 3건이 필요합니다. 표본이 부족하면 기다리거나 다른 근거를 보세요. 고래 지갑의 매집이나 시장 전체 자금 유입을 확인하는 기능은 아닙니다.'],
    ['비트코인 도미넌스', '전체 암호자산 시가총액에서 BTC가 차지하는 비율입니다. 이 종목의 상승 확률이 아닙니다. 종목 분석에서는 CoinPaprika 자료를 사용하며, 이 브라우저에 30분 이상 간격의 비교 기록이 있어야 변화량을 표시합니다.'],
  ],
  en: [
    ['Timeframes', 'Each candle groups 1 hour, 4 hours or one day. Only completed candles are compared; their closes can differ from the current price.'],
    ['Trend and moving averages', 'Each timeframe compares the close with 20- and 50-candle averages. The 1H, 4H and 1D readings receive weights of 1, 2 and 3. At least two valid frames are required. This is not a probability forecast.'],
    ['RSI 14', 'A 0–100 measure of recent gains and losses with Wilder smoothing. Readings above 70 or below 30 flag directional concentration, not a 70% probability or an automatic trade instruction.'],
    ['Relative volume', 'The last completed volume divided by the preceding 20-candle average. 1.5× means 50% more volume; a zero baseline or insufficient history cannot produce a comparison.'],
    ['ATR', 'Average true price range using highs, lows and previous closes. It is expressed in price units and measures movement size, not direction.'],
    ['Support and resistance', 'Historical lows and highs, with volatility buffers, identify areas to watch for a pause in declines or advances. Unobserved resistance is explicitly estimated. A touch alone is not an entry signal.'],
    ['Breakout and downside thresholds', 'Buffers above resistance and below support. Read the stated timeframe and close-above or close-below condition; a brief crossing is different from a candle close.'],
    ['Reward/risk', 'Distance from the support-zone midpoint to resistance divided by distance to the downside threshold. 2:1 describes distances, not win rate or actual return. Costs are excluded.'],
    ['Large executions', 'Relative large trades among up to 20 received trades within five minutes. Requires ten valid trades and three large trades. Insufficient samples remain unavailable; this does not identify whales or total inflows.'],
    ['Bitcoin dominance', 'BTC share of total crypto market capitalization from CoinPaprika. A local observation at least 30 minutes earlier is required to show a change. It is not an asset return forecast.'],
  ],
}
const issues: Record<SeriesIssue, [string, string]> = {
  loading: ['시세와 가격 기록을 불러오는 중입니다. 계속 대기하면 연결 상태를 확인하거나 페이지를 새로고침하세요.', 'Loading quotes and history. Check the connection or reload if loading persists.'],
  mock: ['예시 자료를 실제 시장 판단에 사용하지 않습니다. 설정에서 실제 시장 자료로 전환하세요.', 'Example data is excluded. Switch to live market data in settings.'],
  disconnected: ['시세 연결이 끊겼거나 지원되지 않는 연결입니다. 자동 재연결 후에도 계속되면 다른 거래소 종목을 확인하세요.', 'The quote stream is disconnected or unsupported. If reconnection fails, try a supported venue.'],
  stale: ['최근 시세 또는 완료 봉이 오래되어 이 시간대의 판단을 보류합니다. 새 자료가 도착하면 다시 계산합니다.', 'Quotes or completed candles are stale. This timeframe is excluded until fresh data arrives.'],
  history: ['완료 봉이 50개 이상 필요합니다. 상장 이력이 짧거나 확보한 기록이 부족하면 새로고침해도 바로 채워지지 않습니다.', 'At least 50 completed candles are required. New listings or limited history may remain unavailable after refresh.'],
  gaps: ['최근 50개 봉 사이에 빠진 시간 구간이 있어 제외했습니다. 없는 봉을 만들어 채우지 않습니다.', 'There are gaps among the last 50 candles. Missing candles are not invented.'],
  range: ['가격 계획을 계산할 유효한 변동 폭이 없습니다. 새로운 거래 기록이 확보될 때까지 해당 계산을 보류합니다.', 'No usable price range is available. The price plan waits for valid observations.'],
}
export function CryptoAnalysisHelp({ decision, language }: { decision: CryptoDecision; language: Language }) {
  const ko = language === 'ko'
  return <details className={styles.help}><summary>{ko ? '지표·가격 기준 읽는 방법' : 'How to read indicators and price levels'}</summary><p>{ko ? '각 기능의 뜻, 계산 범위와 자료가 없을 때의 이유를 확인하세요. 준비율은 자료 확보 정도이며 분석의 적중률이 아닙니다.' : 'Review each metric’s meaning, calculation scope and missing-data reasons. Readiness measures data coverage, not prediction accuracy.'}</p>
    {decision.frames.some(frame => frame.issue) && <section><h3>{ko ? '지금 계산에서 빠진 자료' : 'Data currently excluded'}</h3><ul>{decision.frames.filter(frame => frame.issue).map(frame => <li key={frame.frame}><b>{frame.frame} · {frame.count}{ko ? '개 완료 봉' : ' completed candles'}</b><p>{issues[frame.issue!][ko ? 0 : 1]}</p></li>)}</ul></section>}
    <div className={styles.grid}>{guides[language].map(([title, body]) => <details key={title}><summary>{title}</summary><p>{body}</p></details>)}</div>
  </details>
}
