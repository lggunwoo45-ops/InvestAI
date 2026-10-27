import type { Candle } from '@/types/marketDetail'
import { array, numeric, object, percentile, providerNow, sourceData, volatilitySummary, type ResearchSnapshot } from '@/services/research/researchModel'
import { ResearchHelp } from './ResearchHelp'
import { SourceIssue } from './ResearchDataStatus'
import type { ResearchGuideId } from './researchGuides'
import { MarketStructure } from './MarketStructure'
import styles from './ResearchPage.module.css'

export function MarketIndicatorCards({ snapshot, candles, now, simple }: { snapshot: ResearchSnapshot | null; candles: readonly Candle[]; now: number; simple: boolean }) {
  const global = object(object(sourceData(snapshot, 'global', now)).data), caps = object(global.market_cap_percentage)
  const sentiment = object(array(object(sourceData(snapshot, 'sentiment', now)).data)[0])
  const sentimentAt = numeric(sentiment.timestamp), globalAt = numeric(global.updated_at)
  const sentimentAge = sentimentAt === null ? Infinity : providerNow(snapshot, 'sentiment', now) - sentimentAt * 1000
  const globalAge = globalAt === null ? Infinity : providerNow(snapshot, 'global', now) - globalAt * 1000
  const sentimentFresh = sentimentAge >= 0 && sentimentAge < 172_800_000, globalFresh = globalAge >= 0 && globalAge < 3_600_000
  const interest = object(sourceData(snapshot, 'interest', now)), ratio = object(array(sourceData(snapshot, 'ratios', now)).at(-1)), taker = object(array(sourceData(snapshot, 'taker', now)).at(-1))
  const funding = array(sourceData(snapshot, 'fundingHistory', now)).map(object), rates = funding.flatMap(row => { const rate = numeric(row.fundingRate); return rate === null ? [] : [rate] })
  const volatility = volatilitySummary(candles), usdt = numeric(caps.usdt), usdc = numeric(caps.usdc)
  const rows: { id: string; label: string; value: number | null; unit: string; source: string; topic: ResearchGuideId; at: number | null; detail: string; missing: string }[] = [
    { id: 'sentiment', label: '공포·탐욕 지수', value: sentimentFresh ? numeric(sentiment.value) : null, unit: ' / 100', source: 'sentiment', topic: 'sentiment', at: sentimentAt === null ? null : sentimentAt * 1000, detail: '낮을수록 공포, 높을수록 탐욕 · 전체 코인 시장', missing: '일일 지수 또는 발표 시각을 확인하지 못했거나 발표 후 48시간이 지났습니다. 제공처의 다음 발표를 기다려야 합니다.' },
    { id: 'btc', label: 'BTC 도미넌스', value: globalFresh ? numeric(caps.btc) : null, unit: '%', source: 'global', topic: 'dominance', at: globalAt === null ? null : globalAt * 1000, detail: '전체 시가총액 중 비트코인이 차지하는 비율', missing: 'BTC 비중이 없거나 시가총액 발표가 1시간 이상 지났습니다. 제공처의 새 발표가 필요합니다.' },
    { id: 'eth', label: 'ETH 도미넌스', value: globalFresh ? numeric(caps.eth) : null, unit: '%', source: 'global', topic: 'dominance', at: globalAt === null ? null : globalAt * 1000, detail: '전체 시가총액 중 이더리움이 차지하는 비율', missing: 'ETH 비중이 없거나 시가총액 발표가 1시간 이상 지났습니다.' },
    { id: 'stable', label: 'USDT + USDC 비중', value: globalFresh && usdt !== null && usdc !== null ? usdt + usdc : null, unit: '%', source: 'global', topic: 'dominance', at: globalAt === null ? null : globalAt * 1000, detail: '두 스테이블코인 합계 · 모든 스테이블코인의 합계는 아님', missing: '두 자산의 비중이 모두 필요합니다. 값이 빠졌거나 발표가 1시간 이상 지나 합산을 보류했습니다.' },
    { id: 'interest', label: '미결제약정', value: numeric(interest.openInterest), unit: ` ${snapshot?.asset ?? ''}`, source: 'interest', topic: 'interest', at: numeric(interest.time), detail: '아직 끝나지 않은 계약 수량 · 상승·하락 방향과 별개', missing: '현재 계약 수량이 응답에 없습니다. 다른 시점의 기록을 현재값으로 표시하지 않습니다.' },
    { id: 'ratios', label: '롱/숏 계정 비율', value: numeric(ratio.longShortRatio), unit: '배', source: 'ratios', topic: 'ratios', at: numeric(ratio.timestamp), detail: '1보다 크면 롱 계정이 더 많음 · 투자 금액 비율 아님', missing: '최근 시간별 집계에 계정 비율 값이 없습니다.' },
    { id: 'taker', label: '테이커 매수/매도량 비율', value: numeric(taker.buySellRatio), unit: '배', source: 'taker', topic: 'taker', at: numeric(taker.timestamp), detail: '1보다 크면 적극적인 매수 체결량 우세 · 최근 1시간', missing: '최근 집계에 매수·매도 거래량 비율이 없습니다.' },
    { id: 'funding', label: '최근 확정 펀딩 백분위', value: rates.length ? percentile(rates, rates.at(-1)!) : null, unit: '%', source: 'fundingHistory', topic: 'funding', at: numeric(funding.at(-1)?.fundingTime), detail: `최근 확정 ${rates.length}회 중 위치 · 1년 과열도 아님`, missing: '확정 펀딩 표본이 20개 이상 필요합니다. 표본이 쌓인 뒤 상대적인 위치를 계산합니다.' },
    { id: 'hourly', label: '최근 실현 시간 변동성', value: volatility?.hourly ?? null, unit: '%', source: 'candles', topic: 'volatility', at: candles.at(-1)?.timestamp ?? null, detail: '최근 24개 시간 수익률의 변동 크기 · 방향과 별개', missing: '연속된 완료 1시간봉 25개가 필요합니다. 기록 부족·중간 공백 때문에 계산을 보류합니다.' },
    { id: 'daily', label: '일간 환산 변동성', value: volatility?.daily ?? null, unit: '%', source: 'candles', topic: 'volatility', at: candles.at(-1)?.timestamp ?? null, detail: '시간 변동성 × √24 · 내일의 예상 등락률이 아님', missing: '시간 변동성을 먼저 계산할 연속된 완료 1시간봉 25개가 필요합니다.' },
  ]
  const shown = simple ? rows.filter(row => ['sentiment', 'btc', 'ratios'].includes(row.id)) : rows
  return <section className={styles.panel}><h2>{simple ? '숫자가 말해주는 시장의 모습' : '시장 지표·파생상품 컨디션'}</h2><p>숫자의 뜻과 자료 시각을 함께 확인하세요. 각 카드에서 읽는 방법과 예시를 펼칠 수 있습니다.</p><div className={styles.metrics}>{shown.map(row => <article className={styles.metric} key={row.id} aria-label={row.label}>
    <span>{row.label}</span><strong>{row.value === null ? '—' : row.value.toLocaleString('ko-KR', { maximumFractionDigits: 3 }) + row.unit}</strong><small>{row.detail}</small>
    {row.value === null && <SourceIssue snapshot={snapshot} sourceKey={row.source} now={now} fallback={row.missing} readyLabel={row.source === 'global' && !globalFresh || row.source === 'sentiment' && !sentimentFresh ? row.at === null ? '발표 시각 미제공' : '발표값 갱신 대기' : undefined} />}
    <small>{snapshot?.sources[row.source]?.source ?? '제공처 응답 대기'}{row.at !== null ? ` · 원자료 ${new Date(row.at).toLocaleString('ko-KR')}` : ''}</small><ResearchHelp topic={row.topic} />
  </article>)}</div>{!simple && <><MarketStructure snapshot={snapshot} now={now} /><h3>펀딩 이력</h3><ResearchHelp topic="funding" /><div className={styles.tableWrap}><table><caption>최근 확정 펀딩 10회 · Binance</caption><thead><tr><th>정산 시각</th><th>확정 펀딩률</th></tr></thead><tbody>{funding.slice(-10).reverse().map((row, i) => <tr key={i}><td>{numeric(row.fundingTime) === null ? '정산 시각 미제공' : new Date(Number(row.fundingTime)).toLocaleString('ko-KR')}</td><td>{numeric(row.fundingRate) === null ? '정산값 미제공' : `${(Number(row.fundingRate) * 100).toFixed(4)}%`}</td></tr>)}</tbody></table></div>{!funding.length && <SourceIssue snapshot={snapshot} sourceKey="fundingHistory" now={now} />}</>}</section>
}
