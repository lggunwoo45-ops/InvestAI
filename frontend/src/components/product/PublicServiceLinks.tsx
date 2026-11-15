import { useLanguage } from '@/i18n/useLanguage'
import styles from './PublicServiceLinks.module.css'
import { publicServiceOrigin } from '@/config/support'

export function PublicServiceLinks() {
  const ko = useLanguage().language === 'ko'
  return <nav className={styles.links} aria-label={ko ? '서비스 안내' : 'Service information'}>
    <a href={`${publicServiceOrigin}/about/`} target="_blank" rel="noopener noreferrer">{ko ? '서비스 소개' : 'About (Korean)'}</a>
    <a href={`${publicServiceOrigin}/guides/`} target="_blank" rel="noopener noreferrer">{ko ? '사용 설명' : 'Reading guides (Korean)'}</a>
    <a href={`${publicServiceOrigin}/privacy/`} target="_blank" rel="noopener noreferrer">{ko ? '개인정보·데이터 안내' : 'Privacy and data (Korean)'}</a>
  </nav>
}
