import {Link} from 'react-router-dom'
import type {Language} from '@/i18n/translations'
import styles from './ProductExperience.module.css'

export function FirstReview({language}:{language:Language}) {
  const ko=language==='ko'
  return <section className={styles.home} aria-label={ko?'첫 분석 시작':'Start a first review'}><div className={styles.hero}><div><span className={styles.eyebrow}>FROM A SIGNAL TO A RECORD</span><h1>{ko?'가격을 보기 전에, 판단의 기준부터.':'Give your next review a clear basis.'}</h1><p>{ko?'종목을 아직 못 골랐다면 비트코인으로 시작하세요. 현재 흐름과 중요한 가격을 확인하고, 판단이 어떻게 달라지는지 기록할 수 있어요.':'Start with Bitcoin if you have no asset in mind. Review its current trend and key levels, then keep track of what changes.'}</p><div className={styles.actions}><Link className={styles.primary} to="/my-analysis?instrumentId=upbit-btc">{ko?'BTC 바로 분석하기':'Review Bitcoin now'} →</Link><Link to="/demo">{ko?'처음 사용하는 방법':'How it works'}</Link></div></div><div className={styles.preview}><span>{ko?'분석 화면에서 확인할 것 · 설명용':'What the analysis shows · guide'}</span><ol><li><b>01</b><div><strong>{ko?'지금의 흐름':'Current trend'}</strong>{ko?'상승·하락 판단과 그 이유':'Direction and the evidence behind it'}</div></li><li><b>02</b><div><strong>{ko?'판단이 바뀌는 가격':'Prices that change the view'}</strong>{ko?'지지·저항과 조건 무효화 가격':'Support, resistance and invalidation levels'}</div></li><li><b>03</b><div><strong>{ko?'기록 이후의 결과':'What happens afterward'}</strong>{ko?'목표·손절·미진입을 같은 기준으로 확인':'Review targets, stops and skipped entries consistently'}</div></li></ol></div></div></section>
}
