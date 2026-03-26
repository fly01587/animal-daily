import styles from './TabBar.module.css'

export type TabId = 'today' | 'calendar' | 'stats' | 'profile'

interface Tab {
  id: TabId
  icon: string
  label: string
}

const TABS: Tab[] = [
  { id: 'today', icon: '📋', label: '今日' },
  { id: 'calendar', icon: '📅', label: '日历' },
  { id: 'stats', icon: '📊', label: '统计' },
  { id: 'profile', icon: '👤', label: '我的' },
]

interface TabBarProps {
  active: TabId
  onChange: (id: TabId) => void
}

export default function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav className={styles.tabBar}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`${styles.tab} ${active === tab.id ? styles.tabActive : ''}`}
          onClick={() => onChange(tab.id)}
        >
          <span className={styles.tabIcon}>{tab.icon}</span>
          <span className={styles.tabLabel}>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
