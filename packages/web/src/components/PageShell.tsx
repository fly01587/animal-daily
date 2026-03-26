import type { ReactNode } from 'react'
import styles from './PageShell.module.css'

export type ProfileSubScreen =
  | 'profile-category'
  | 'profile-goal'
  | 'profile-reminder'
  | 'profile-export'
  | 'profile-language'
  | 'profile-about'
  | 'profile-market-monitor'

export type ScreenId =
  | 'splash'
  | 'login'
  | 'register'
  | 'home'
  | 'calendar'
  | 'stats'
  | 'profile'
  | 'ai-chat'
  | 'day-detail'
  | ProfileSubScreen

interface FooterTab {
  id: ScreenId
  label: string
  icon: string
  iconActive: string
}

const FOOTER_TABS: FooterTab[] = [
  { id: 'home', label: '今日', icon: '🏠', iconActive: '🏠' },
  { id: 'calendar', label: '日历', icon: '📅', iconActive: '📅' },
  { id: 'stats', label: '统计', icon: '📊', iconActive: '📊' },
  { id: 'profile', label: '我的', icon: '👤', iconActive: '👤' },
]

interface PageShellProps {
  screen: ScreenId
  onNavigate: (screen: ScreenId) => void
  children: ReactNode
}

export default function PageShell({ screen, onNavigate, children }: PageShellProps) {
  const tabScreens = ['home', 'calendar', 'stats', 'profile']
  const isProfileSub = screen.startsWith('profile-') || screen === 'ai-chat'
  const isDayDetail = screen === 'day-detail'
  const showFooter = tabScreens.includes(screen) || isProfileSub || isDayDetail
  const activeTab = isDayDetail ? 'calendar' : isProfileSub ? 'profile' : screen
  const lockInnerScroll = screen === 'home'

  return (
    <div className={styles.shell}>
      {/* Top gradient */}
      <div className={styles.gradient} />

      {/* Main content section */}
      <div className={styles.section}>
        <div
          className={`${styles.sectionInner} ${
            lockInnerScroll ? styles.sectionInnerNoScroll : styles.sectionInnerScrollable
          }`}
        >
          <div className={styles.sectionContent}>
            {children}
          </div>

          {/* Footer tab bar */}
          {showFooter && (
            <nav className={styles.footer}>
              {FOOTER_TABS.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    className={`${styles.footerTab} ${isActive ? styles.footerTabActive : ''}`}
                    onClick={() => onNavigate(tab.id)}
                  >
                    <span className={styles.footerTabIcon}>{isActive ? tab.iconActive : tab.icon}</span>
                    <span className={styles.footerTabLabel}>{tab.label}</span>
                    {isActive && <span className={styles.footerTabIndicator} />}
                  </button>
                )
              })}
            </nav>
          )}
        </div>
      </div>
    </div>
  )
}
