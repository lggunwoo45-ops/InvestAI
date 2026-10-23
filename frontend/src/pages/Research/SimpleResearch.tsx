import { Link } from 'react-router-dom'
import type { Candle } from '@/types/marketDetail'
import { readObservations } from '@/services/research/researchJournal'
import type { ResearchMode } from './researchExperience'
import styles from './ResearchPage.module.css'

const number = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
const date = (at: number) => new Date(at).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

const simpleTasks = [
  { mode: 'indicators', icon: '↗', title: '가격 말고 무엇을 볼까요?', description: '거래량과 시장 참여자의 움직임 살펴보기', help: '가격과 함께 거래가 얼마나 활발한지 확인해보세요. 아래 지표는 서로 다른 시장의 모습이며, 하나만으로 방향을 판단할 수 없어요.' },
  { mode: 'position', icon: '±', title: '가격이 바뀌면 손익은 얼마일까요?', description: '내가 입력한 금액으로 손익과 위험 계산하기', help: '매수·매도 방향, 비교할 두 가격과 투자금을 넣어보세요. 선물 거래를 가정한 계산이며 실제 계좌를 연결하거나 주문하지 않아요.' },
  { mode: 'costs', icon: '%', title: '거래에 드는 비용은 얼마일까요?', description: '거래 수수료와 선물 보유 비용 비교하기', help: '거래를 시작하고 끝낼 때 내는 수수료에, 선물을 보유할 때 주고받는 펀딩비를 더해 비교해요. 수수료 기본값은 예시이므로 본인 거래소 요금으로 바꿔주세요.' },
  { mode: 'premium', icon: '⇄', title: '국내외 가격은 얼마나 다를까요?', description: '같은 코인의 원화 환산 가격 비교하기', help: '국내 원화 가격과 해외 가격을 같은 단위로 맞춰 비교해요. 먼저 공개 시세로 채운 뒤 가격 차이를 확인하세요. 가격 차이가 그대로 이익이 되지는 않아요.' },
  { mode: 'setups', icon: '◷', title: '과거에도 비슷한 흐름이 있었나요?', description: '조건을 골라 과거 가격 움직임 확인하기', help: '확인할 조건을 고르면 과거에 같은 조건이 나타난 사례를 찾아요. 표본 수와 결과를 함께 보세요. 과거 비율은 앞으로 성공할 확률이 아니에요.' },
] as const

export function SimpleResearchNav({ mode, onMode }: { mode: ResearchMode; onMode: (mode: ResearchMode) => void }) {
  return <nav className={styles.simpleNav} aria-label="시장·기록 이용 순서">{[
    ['overview', '시장 살펴보기', '가격과 변화를 이해해요'],
    ['journal', '내 생각 기록', '관심 이유를 남겨요'],
    ['alerts', '알림·결과', '정한 조건을 다시 확인해요'],
  ].map(([key, title, hint], i) => <button key={key} aria-current={mode === key ? 'page' : undefined} onClick={() => onMode(key as ResearchMode)}><span className={styles.stepNumber}>{i + 1}</span><span><b>{title}</b><small>{hint}</small></span></button>)}</nav>
}

export function SimpleToolIntro({ mode, onBack }: { mode: ResearchMode; onBack: () => void }) {
  const task = simpleTasks.find(t => t.mode === mode)
  if (!task) return null
  return <aside className={styles.toolIntro}><button onClick={onBack}>← 시장 살펴보기</button><h2>{task.title}</h2><p>{task.help}</p></aside>
}

export function SimpleMarketSummary({ asset, price, at, candles, loading, onMode, onWatch, watchlisted, canWatch, message }: {
  asset: string; price: number | null; at: number | null; candles: readonly Candle[]; loading: boolean;
  onMode: (mode: ResearchMode) => void; onWatch: () => void; watchlisted: boolean; canWatch: boolean; message: string;
}) {
  const previous = readObservations().find(r => r.asset === asset)
  const change = price !== null && previous ? (price / previous.price - 1) * 100 : null
  const recent = candles.slice(-25)
  const continuous = recent.length === 25 && recent.every((c, i) => i === 0 || c.timestamp - recent[i - 1]!.timestamp === 3_600_000)
  const dayChange = continuous ? (recent.at(-1)!.close / recent[0]!.close - 1) * 100 : null
  const priorVolume = continuous ? recent.slice(-21, -1).reduce((sum, c) => sum + c.volume, 0) / 20 : 0
  const volumeRatio = priorVolume > 0 ? recent.at(-1)!.volume / priorVolume : null
  const prices = recent.map(c => c.close), low = Math.min(...prices), span = Math.max(...prices) - low || 1
  return <>
    <div className={styles.simpleOverview}>
      <section className={styles.priceStory} aria-label="가격과 쉬운 설명">
        <div className={styles.storyTop}><span className={styles.assetBadge}>{asset.slice(0, 1)}</span><div><h2>{asset} 지금 가격</h2><small>Binance · 해외 선물 기준 가격</small></div><button onClick={onWatch} disabled={!canWatch || watchlisted}>{watchlisted ? '✓ 관심종목' : '+ 관심종목'}</button></div>
        <div className={styles.heroPrice} aria-label="현재 기준 가격">{price === null ? (loading ? '가격 확인 중…' : '가격을 확인할 수 없어요') : <>{number(price)} <span>USDT</span></>}</div>
        <p className={styles.priceTime}>{at ? `${date(at)} 기준` : '새로고침으로 다시 확인할 수 있어요.'}</p>
        {prices.length > 1 && <figure className={styles.simpleChart}><svg viewBox="0 0 600 95" role="img" aria-label="최근 완료된 1시간봉 가격 흐름"><polyline points={prices.map((v, i) => `${i / (prices.length - 1) * 600},${85 - (v - low) / span * 75}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2.5" /></svg><figcaption>시간별 가격 흐름 · {date(recent[0]!.timestamp)}–{date(recent.at(-1)!.timestamp)}</figcaption></figure>}
        <div className={styles.insightRows}><div><span>가격 흐름</span><p>{dayChange === null ? '최근 하루의 흐름을 설명할 자료가 부족해요.' : `최근 완료된 24시간 동안 가격이 ${number(Math.abs(dayChange))}% ${dayChange > 0 ? '올랐어요' : dayChange < 0 ? '내렸어요' : '변했어요'}.`}</p></div><div><span>거래 움직임</span><p>{volumeRatio === null ? '거래량을 비교할 자료가 부족해요.' : `최근 1시간 거래량은 그전 20시간 평균의 ${number(volumeRatio)}배예요.`}</p></div></div>
        <details><summary>이 가격은 무엇인가요?</summary><p>USDT는 이 거래소에서 가격을 표시하는 단위예요. 이 화면은 선물의 손익·청산 계산에 쓰이는 기준 가격을 보여줘요. 국내 원화 현물 가격과 다르며, 검토 기록도 같은 기준으로 저장해요. 위 흐름 설명은 완료된 시간봉을 비교한 결과예요.</p></details>
        {message && <p role="status">{message}</p>}
      </section>
      <aside className={styles.nextAction} aria-label="다음에 할 일"><span className={styles.eyebrow}>{previous ? '지난 생각 이어보기' : '처음이라면 여기부터'}</span><h2>{previous ? '지난번과 무엇이 달라졌나요?' : '관심 있는 이유를 한 줄 남겨보세요'}</h2>
        {previous ? <><div className={styles.reviewChange}>{change === null ? '현재 가격 확인 필요' : `${change > 0 ? '+' : ''}${number(change)}%`}<small>지난 검토 이후 기준 가격 변화</small></div><blockquote>{previous.note || '이전 검토에 메모가 없어요.'}</blockquote><small>{date(previous.at)} · {number(previous.price)} USDT</small></> : <p>“가격이 내려온 이유가 궁금해요”처럼 편하게 적어도 좋아요. 다음 방문에 지금 가격과 함께 비교할 수 있어요.</p>}
        <button className={styles.primaryAction} onClick={() => onMode('journal')}>{previous ? '생각 이어서 기록하기' : '첫 기록 남기기'} →</button><button onClick={() => onMode('alerts')}>저장한 조건·결과 보기</button><p className={styles.caption}>가격 변화는 내 계좌 수익률이 아니에요. 기록은 두 모드에서 함께 사용해요.</p>
      </aside>
    </div>
    <section className={styles.taskSection} aria-label="궁금한 내용으로 살펴보기"><div className={styles.sectionHeading}><div><h2>무엇이 궁금하세요?</h2><p>필요한 내용을 고르면 설명과 계산을 이어서 볼 수 있어요.</p></div><button onClick={() => onMode('guide')}>처음 이용하는 분께 →</button></div><div className={styles.taskGrid}>{simpleTasks.map(task => <button key={task.mode} className={styles.taskCard} onClick={() => onMode(task.mode)}><span className={styles.taskIcon} aria-hidden="true">{task.icon}</span><span><b>{task.title}</b><small>{task.description}</small></span><span aria-hidden="true">→</span></button>)}</div></section>
    <div className={styles.simpleLinks}><Link to="/portfolio">내가 보유한 자산 보기 →</Link><Link to="/news">뉴스에서 배경 찾아보기 →</Link></div>
  </>
}
