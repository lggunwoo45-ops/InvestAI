import { researchModes,type ResearchMode } from './researchExperience'
import styles from './ResearchPage.module.css'
const groups=[{name:'시장 살펴보기',description:'가격과 지표',modes:['overview','indicators']},{name:'분석 도구',description:'위험·비용·신호',modes:['position','costs','premium','setups']},{name:'기록과 감시',description:'내 근거와 이후 결과',modes:['journal','alerts','guide']}]
export function ExpertResearchNav({mode,onMode}:{mode:ResearchMode;onMode:(mode:ResearchMode)=>void}){
  const active=groups.find(g=>g.modes.includes(mode))??groups[0]!
  return <div className={styles.expertNavigation}><nav className={styles.navGroups} aria-label="연구실 기능 분류">{groups.map(group=><button key={group.name} aria-current={group===active?'true':undefined} onClick={()=>onMode(group.modes[0] as ResearchMode)}><b>{group.name}</b><span>{group.description}</span></button>)}</nav><nav className={styles.tabs} aria-label="시장 연구 모드">{researchModes.filter(([key])=>active.modes.includes(key)).map(([key,label])=><button key={key} aria-current={mode===key?'page':undefined} onClick={()=>onMode(key)}>{label}</button>)}</nav></div>
}
