import { Icon } from '@/components/Icon/Icon'
import styles from './TextAction.module.css'

interface TextActionProps {
  label: string
  disabled?: boolean
}

export function TextAction({ label, disabled = false }: TextActionProps) {
  return <button className={styles.action} type="button" disabled={disabled}>{label}<Icon name="arrowUpRight" size={12} /></button>
}
