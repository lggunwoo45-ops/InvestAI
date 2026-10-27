import { useState } from 'react'
import { researchGuides, type ResearchGuideId } from './researchGuides'
import styles from './ResearchHelp.module.css'

export function ResearchHelp({ topic, intro = false }: { topic: ResearchGuideId; intro?: boolean }) {
  const guide = researchGuides[topic]
  const links = topic === 'sentiment' ? [['Alternative.me 방법론', 'https://alternative.me/crypto/fear-and-greed-index/']]
    : topic === 'dominance' ? [['CoinGecko 시장 자료', 'https://www.coingecko.com/']]
    : topic === 'history' ? [['Bybit 미결제약정 기준', 'https://bybit-exchange.github.io/docs/v5/market/open-interest'], ['확정 펀딩 기준', 'https://bybit-exchange.github.io/docs/v5/market/history-fund-rate']]
    : topic === 'liquidations' ? [['Bybit 청산 자료 기준', 'https://bybit-exchange.github.io/docs/v5/websocket/public/all-liquidation']]
    : topic === 'events' ? [['BLS 발표 일정', 'https://www.bls.gov/schedule/news_release/'], ['FOMC 회의 일정', 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm']]
    : ['interest', 'ratios', 'taker', 'funding', 'turnover', 'volatility'].includes(topic) ? [['Binance 공개 자료 안내', 'https://developers.binance.com/en/docs/catalog']] : []
  return <div className={styles.help}>
    {intro && <p className={styles.intro}>{guide.purpose}</p>}
    <details><summary>{guide.title} · 읽는 방법</summary>
      {!intro && <p>{guide.purpose}</p>}
      <dl><div><dt>어떻게 읽나요?</dt><dd>{guide.read}</dd></div><div><dt>숫자로 보면</dt><dd>{guide.example}</dd></div><div><dt>자료가 없을 때</dt><dd>{guide.missing}</dd></div><div><dt>계산·자료 범위</dt><dd>{guide.basis}</dd></div></dl>
      {!!links.length && <p>{links.map(([title, url]) => <a key={url} href={url} target="_blank" rel="noreferrer">{title} ↗ </a>)}</p>}
    </details>
  </div>
}

export function ResearchGuideLibrary() {
  const [query, setQuery] = useState('')
  const matches = (Object.keys(researchGuides) as ResearchGuideId[]).filter(key => key !== 'guide' && Object.values(researchGuides[key]).join(' ').toLowerCase().includes(query.trim().toLowerCase()))
  return <section className={styles.library} aria-label="기능별 설명서"><h2>궁금한 기능부터 찾아보세요</h2><p>기능의 목적, 해석 예시, 계산 범위와 자료가 없을 때 할 일을 모았습니다.</p><label>기능·용어 찾기<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="예: 펀딩, 미결제약정, 알림" /></label><div className={styles.libraryGrid}>{matches.map(key => <article key={key}><h3>{researchGuides[key].title}</h3><ResearchHelp topic={key} intro /></article>)}</div>{!matches.length && <p>검색어와 맞는 설명이 없습니다. 다른 용어로 찾아보세요.</p>}</section>
}
