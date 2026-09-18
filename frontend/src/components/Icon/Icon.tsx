import type { SVGProps } from 'react'

export type IconName =
  | 'dashboard'
  | 'markets'
  | 'portfolio'
  | 'trading'
  | 'ai'
  | 'strategies'
  | 'news'
  | 'discover'
  | 'briefing'
  | 'settings'
  | 'search'
  | 'menu'
  | 'panel'
  | 'chevronDown'
  | 'arrowUpRight'
  | 'sparkles'
  | 'plus'
  | 'empty'

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  name: IconName
  size?: number
}

export function Icon({ name, size = 20, ...props }: IconProps) {
  const paths: Record<IconName, React.ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    markets: <><path d="M4 18V9" /><path d="M10 18V5" /><path d="M16 18v-7" /><path d="M22 18V3" /><path d="M2 21h20" /></>,
    portfolio: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 11h18" /><path d="M10 11v2h4v-2" /></>,
    trading: <><path d="m7 7 4-4 4 4" /><path d="M11 3v13" /><path d="m17 17-4 4-4-4" /><path d="M13 21V8" /></>,
    ai: <><path d="M12 3a6 6 0 0 0-6 6v2a4 4 0 0 0-2 3.5A4.5 4.5 0 0 0 8.5 19H10" /><path d="M12 3a6 6 0 0 1 6 6v2a4 4 0 0 1 2 3.5A4.5 4.5 0 0 1 15.5 19H14" /><path d="M9 10h.01M15 10h.01" /><path d="M9 15c1.5 1 4.5 1 6 0" /></>,
    strategies: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.09A1.7 1.7 0 0 0 8.94 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.57 15 1.7 1.7 0 0 0 3 14H3v-4h.09A1.7 1.7 0 0 0 4.6 8.94a1.7 1.7 0 0 0-.34-1.88L4.2 7l2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.57 1.7 1.7 0 0 0 10 3h4v.09A1.7 1.7 0 0 0 15.06 4.6a1.7 1.7 0 0 0 1.88-.34L17 4.2 19.83 7l-.06.06A1.7 1.7 0 0 0 19.43 9 1.7 1.7 0 0 0 21 10h.09v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    news: <><path d="M5 22h14a2 2 0 0 0 2-2V5H7v15a2 2 0 0 1-2 2Z" /><path d="M3 11v9a2 2 0 0 0 2 2" /><path d="M11 9h6M11 13h6M11 17h4" /></>,
    discover: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /></>,
    briefing: <><path d="M4 5h16v14H4z" /><path d="M8 9h8M8 13h8M8 17h5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34A1.7 1.7 0 0 0 14 20.91V21h-4v-.09A1.7 1.7 0 0 0 8.94 19.4a1.7 1.7 0 0 0-1.88.34L7 19.8 4.2 17l.06-.06A1.7 1.7 0 0 0 4.6 15.06 1.7 1.7 0 0 0 3.09 14H3v-4h.09A1.7 1.7 0 0 0 4.6 8.94a1.7 1.7 0 0 0-.34-1.88L4.2 7 7 4.2l.06.06A1.7 1.7 0 0 0 8.94 4.6 1.7 1.7 0 0 0 10 3.09V3h4v.09a1.7 1.7 0 0 0 1.06 1.51 1.7 1.7 0 0 0 1.88-.34L17 4.2 19.8 7l-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.91 10H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    panel: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" /></>,
    chevronDown: <path d="m7 10 5 5 5-5" />,
    arrowUpRight: <><path d="M7 17 17 7" /><path d="M7 7h10v10" /></>,
    sparkles: <><path d="m12 3 1.2 3.2L16.5 7.5l-3.3 1.3L12 12l-1.2-3.2-3.3-1.3 3.3-1.3L12 3Z" /><path d="m18.5 14 1 2.5L22 17.5l-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5Z" /><path d="m5.5 13 .8 2.2 2.2.8-2.2.8L5.5 19l-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    empty: <><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></>,
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  )
}
