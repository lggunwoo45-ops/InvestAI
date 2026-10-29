import { Link } from 'react-router-dom'
import { LiveCandidateSearch } from '@/components/ai-analysis/LiveCandidateSearch'
import { SimpleFeatureLinks, SimpleWorkspace } from '@/components/simple/SimpleWorkspace'
import { useLanguage } from '@/i18n/useLanguage'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function SimpleHome() {
  const ko = useLanguage().language === 'ko'
  useDocumentTitle(ko ? '추천 · 쉽게 보기' : 'Candidates · Simple')
  return <SimpleWorkspace title={ko ? '오늘은 무엇을 살펴볼까요?' : 'What should I review today?'} description={ko ? '상승 눌림·돌파·하락 속 반등을 구분하고, 진입 조건과 감수할 손실부터 확인하세요.' : 'Explore pullbacks, breakouts and countertrend rebounds with clear entry conditions and planned losses.'}
    actions={<><Link to="/portfolio">{ko ? '내 종목 확인' : 'My holdings'} →</Link><Link to="/research?mode=alerts">{ko ? '가격 알림' : 'Price alerts'} →</Link></>}>
    <LiveCandidateSearch />
    <section><h2>{ko ? '다른 도움이 필요하다면' : 'What else would help?'}</h2><SimpleFeatureLinks /></section>
  </SimpleWorkspace>
}
