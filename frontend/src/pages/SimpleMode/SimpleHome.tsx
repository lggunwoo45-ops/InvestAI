import { Link } from 'react-router-dom'
import { LiveCandidateSearch } from '@/components/ai-analysis/LiveCandidateSearch'
import { SimpleFeatureLinks, SimpleWorkspace } from '@/components/simple/SimpleWorkspace'
import { useLanguage } from '@/i18n/useLanguage'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function SimpleHome() {
  const ko = useLanguage().language === 'ko'
  useDocumentTitle(ko ? '추천 · 쉽게 보기' : 'Candidates · Simple')
  return <SimpleWorkspace title={ko ? '오늘은 무엇을 살펴볼까요?' : 'What should I review today?'} description={ko ? '살펴볼 후보와 기다려야 할 이유를 함께 확인하세요. 조건에 맞는 종목이 없으면 대기를 안내합니다.' : 'See a short list and reasons to wait. There may be no qualifying assets.'}
    actions={<><Link to="/portfolio">{ko ? '내 종목 확인' : 'My holdings'} →</Link><Link to="/research?mode=alerts">{ko ? '가격 알림' : 'Price alerts'} →</Link></>}>
    <LiveCandidateSearch />
    <section><h2>{ko ? '다른 도움이 필요하다면' : 'What else would help?'}</h2><SimpleFeatureLinks /></section>
  </SimpleWorkspace>
}
