import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/i18n/useLanguage'
import { readResearchResume } from '@/services/research/researchResume'
import styles from './ResearchResume.module.css'

export function ResearchResume() {
  const { language } = useLanguage()
  const ko = language === 'ko'
  const [items, setItems] = useState(readResearchResume)
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    const refresh = () => setItems(readResearchResume())
    const sync = (event: StorageEvent) => { if (event.key === null || event.key.startsWith('investai.research.')) refresh() }
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    window.addEventListener('storage', sync)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', onVisible) }
  }, [])
  const number = (value: number) => value.toLocaleString(ko ? 'ko-KR' : 'en-US', { maximumFractionDigits: 6 })
  const date = (at: number) => new Date(at).toLocaleString(ko ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  const visible = expanded ? items : items.slice(0, 3)
  return <section className={styles.resume} aria-label={ko ? '지난 기록 이어보기' : 'Continue your research'}>
    <header className={styles.heading}><div><span className={styles.eyebrow}>{ko ? '한 번에 한 종목씩' : 'ONE ASSET AT A TIME'}</span><h2>{items.length ? (ko ? '지난번 생각, 오늘 이어볼까요?' : 'Pick up where you left off') : (ko ? '어디서 시작할지 고민이라면' : 'A simple place to start')}</h2><p>{items.length ? (ko ? '작성 중인 메모와 최근 기록부터 모았어요.' : 'Your unfinished notes and most recent records come first.') : (ko ? '코인 하나의 흐름을 보고, 궁금한 점을 한 줄 남겨보세요.' : 'Explore one coin, then leave a note about what you want to check next.')}</p></div>{items.length > 0 && <Link className={styles.newAsset} to={`/research?asset=${items[0]!.asset}&mode=check`}>{ko ? '종목 살펴보기' : 'Explore an asset'} ↗</Link>}</header>
    {!items.length ? <div className={styles.start}><ol><li><span>01</span>{ko ? '지금 시장 보기' : 'Explore the market'}</li><li><span>02</span>{ko ? '내 생각 남기기' : 'Leave a note'}</li><li><span>03</span>{ko ? '다음에 이어보기' : 'Return to your review'}</li></ol><Link className={styles.primary} to="/research?asset=BTC&mode=overview">{ko ? '첫 종목 살펴보기' : 'Explore your first coin'} →</Link></div>
      : <><div className={styles.cards}>{visible.map(item => {
        const toJournal = Boolean(item.draft || item.review)
        const note = item.draft || item.review?.note || item.rule?.review?.note || item.event?.review?.note
        return <article key={item.asset} className={styles.card} aria-label={`${item.asset} ${ko ? '이어보기' : 'saved research'}`}>
          <div className={styles.cardHeading}><h3>{item.asset}</h3><span className={item.draft ? styles.draftBadge : styles.savedBadge}>{item.draft ? (ko ? '작성 중인 메모' : 'Unfinished note') : item.review ? (ko ? '저장한 검토' : 'Saved review') : (ko ? '가격 조건·기록' : 'Price records')}</span></div>
          <p className={styles.note}>{note || (ko ? '다음에 확인할 가격과 기록을 이어서 살펴보세요.' : 'Return to your saved prices and observations.')}</p>
          {item.review && <div className={styles.basis}><span>{ko ? '지난 검토 기준' : 'Saved review price'}</span><b>{number(item.review.price)} USDT</b><time dateTime={new Date(item.review.at).toISOString()}>{date(item.review.at)}</time></div>}
          {item.rule && <div className={styles.rule}><span>{ko ? '저장한 가격 조건' : 'Saved price conditions'}</span><div>{item.rule.above !== null && <b>↑ {number(item.rule.above)} USDT</b>}{item.rule.below !== null && <b>↓ {number(item.rule.below)} USDT</b>}</div></div>}
          {item.event && <details className={styles.event}><summary>{ko ? '이전에 확인한 가격 통과' : 'Previously observed crossing'}</summary><p>{date(item.event.at)} · {item.event.kind === 'above' ? (ko ? '위쪽 가격 통과' : 'Upper price crossed') : (ko ? '아래쪽 가격 통과' : 'Lower price crossed')}<br />{ko ? '당시 확인한 가격' : 'Observed price'} {number(item.event.price)} USDT</p></details>}
          <div className={styles.actions}><Link className={styles.primary} to={`/research?asset=${item.asset}&mode=${toJournal ? 'journal' : 'alerts'}`}>{item.draft ? (ko ? '메모 이어쓰기' : 'Continue note') : item.review ? (ko ? '지난 기록과 비교하기' : 'Compare with your review') : (ko ? '가격 조건·기록 보기' : 'Open price records')} →</Link>{toJournal && item.rule && <Link className={styles.secondary} to={`/research?asset=${item.asset}&mode=alerts`}>{ko ? '가격 조건 보기' : 'View price conditions'} ↗</Link>}</div>
        </article>
      })}</div>{items.length > 3 && <button className={styles.more} onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>{expanded ? (ko ? '최근 종목만 보기' : 'Show recent assets') : (ko ? `저장한 종목 ${items.length}개 모두 보기` : `Show all ${items.length} saved assets`)}</button>}</>}
    <footer>{items.length ? (ko ? '이 브라우저에 남긴 기록이에요. 표시된 가격은 저장 당시 기준이며, 현재 가격은 종목 화면에서 확인해요. 홈에서는 가격 알림이 작동하지 않아요.' : 'Records from this browser. Prices shown are saved observations; open an asset for current prices. Price alerts do not run on Home.') : (ko ? '기록은 이 브라우저에 보관돼요. 다음 방문에는 이곳에서 이어볼 수 있어요.' : 'Notes stay in this browser, ready for your next visit.')}</footer>
  </section>
}
