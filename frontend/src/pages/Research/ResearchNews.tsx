import { Link } from 'react-router-dom'
import { useNewsProviderMode } from '@/hooks/useNewsProviderMode'
import { filterNews } from '@/services/news/newsSelectors'
import { safeNewsUrl } from '@/utils/safeNewsUrl'
import styles from './ResearchPage.module.css'
export function ResearchNews({ asset }: { asset: string }) {
  const { result } = useNewsProviderMode()
  const articles = filterNews(result?.articles ?? [], { symbol: asset }).filter(article => !article.isMock).slice(0, 5)
  return <section className={styles.subpanel}><h3>{asset} 관련 출처 확인</h3><p>연결된 뉴스 중 종목이 명시된 기사만 표시합니다. 제목에 없는 관계나 가격 변동의 원인을 추정하지 않습니다.</p>
    {!articles.length ? <p>현재 연결된 실제 뉴스에서 이 종목과 명시적으로 연결된 기사가 없습니다. 시장 수치만으로 변동 원인을 설명할 수 없습니다.</p> : <ul>{articles.map(article => { const url = safeNewsUrl(article.url); return <li key={article.id}>{url ? <a href={url} target="_blank" rel="noreferrer">{article.title}</a> : article.title}<br /><small>{article.source} · {article.publishedAt}</small></li> })}</ul>}
    <Link to="/news">뉴스와 원문 더 확인하기</Link>
  </section>
}
