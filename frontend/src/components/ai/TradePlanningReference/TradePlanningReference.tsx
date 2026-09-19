import type { Language } from '@/i18n/translations'
import { uiText } from '@/i18n/translations'
import type { AiScenarioTradePlan } from '@/types/aiScenario'
import styles from './TradePlanningReference.module.css'

interface TradePlanningReferenceProps { plan: AiScenarioTradePlan; language: Language }

export function TradePlanningReference({ plan, language }: TradePlanningReferenceProps) {
  const text = uiText[language].copilot
  const rows = [
    [text.firstInterest, plan.firstInterestArea],
    [text.secondInterest, plan.secondInterestArea],
    [text.invalidation, plan.invalidationCondition],
    [text.targetArea, plan.targetArea],
  ] as const
  return <section className={styles.panel} aria-label={text.planningReference}>
    <header><strong>{text.planningReference}</strong><span>{text.planningOnly}</span></header>
    <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <p>{text.planningOnly} · {text.notInstruction}<br />{text.waitConfirmation} {text.ownRiskControl}<br />{text.noAdvice}</p>
  </section>
}
