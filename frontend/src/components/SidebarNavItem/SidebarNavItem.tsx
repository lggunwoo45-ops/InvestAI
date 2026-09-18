import { NavLink } from 'react-router-dom'

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
  return (
    <NavLink
      to={item.path}
      title={compact ? label : undefined}
      className={({ isActive }) => classNames(styles.link, isActive && styles.active)}
    >
      <Icon name={item.icon} size={18} />
      {!compact && <span>{label}</span>}
    </NavLink>
  )
}
