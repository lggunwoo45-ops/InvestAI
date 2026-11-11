import { Link, useLocation } from 'react-router-dom'

import { navigationSection } from '@/app/navigation'
import { Icon } from '@/components/Icon/Icon'
import type { NavigationItem } from '@/types/navigation'
import { classNames } from '@/utils/classNames'
import styles from './SidebarNavItem.module.css'

interface SidebarNavItemProps {
  item: NavigationItem
  compact: boolean
  label?: string
}

export function SidebarNavItem({ item, compact, label = item.label }: SidebarNavItemProps) {
  const active = navigationSection(useLocation()) === item.path
  return (
    <Link
      to={item.path}
      aria-label={label}
      title={compact ? label : undefined}
      aria-current={active ? 'page' : undefined}
      className={classNames(styles.link, active && styles.active)}
    >
      <Icon name={item.icon} size={18} />
      {!compact && <span>{label}</span>}
    </Link>
  )
}
