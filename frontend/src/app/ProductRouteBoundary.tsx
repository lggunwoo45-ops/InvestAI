import { Link, Outlet, useLocation } from 'react-router-dom'
import { isUnavailableProductRequest, productScope } from './productScope'
import { useLanguage } from '@/i18n/useLanguage'
import { SimpleWorkspace } from '@/components/simple/SimpleWorkspace'

export function ProductRouteBoundary() {
  const { search } = useLocation()
  const ko = useLanguage().language === 'ko'
  if (!isUnavailableProductRequest(search)) return <Outlet />
  return <SimpleWorkspace title={ko ? '이 서비스에서 제공하지 않는 시장입니다' : 'This market is not available here'} description={ko ? (productScope.kind === 'crypto' ? '마켓코파일럿은 코인 전용 서비스입니다. 기존 주식 기록은 삭제하지 않고 보관합니다.' : '이 개발용 화면에서는 주식 기능을 확인할 수 있습니다.') : 'This product has a separate market scope. Existing saved records are preserved.'}>
    <Link to="/market">{ko ? '마켓으로 이동' : 'Open market'}</Link>
  </SimpleWorkspace>
}
