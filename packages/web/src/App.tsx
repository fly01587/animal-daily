import { useState, useEffect } from 'react'
import type { User, Category } from '@animal-daily/shared'
import { api, clearTokens } from './api'
import PageShell from './components/PageShell'
import type { ScreenId } from './components/PageShell'
import SplashPage from './pages/SplashPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomePage from './pages/HomePage'
import CalendarPage from './pages/CalendarPage'
import StatsPage from './pages/StatsPage'
import ProfilePage from './pages/ProfilePage'
import CategorySettingsPage from './pages/CategorySettingsPage'
import GoalSettingsPage from './pages/GoalSettingsPage'
import ReminderSettingsPage from './pages/ReminderSettingsPage'
import ExportSettingsPage from './pages/ExportSettingsPage'
import LanguageSettingsPage from './pages/LanguageSettingsPage'
import AboutPage from './pages/AboutPage'
import AiChatPage from './pages/AiChatPage'
import MarketMonitorPage from './pages/MarketMonitorPage'
import DayDetailPage from './pages/DayDetailPage'
// styles imported in main.tsx

export default function App() {
  const [screen, setScreen] = useState<ScreenId>('splash')
  const [user, setUser] = useState<User | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedDate, setSelectedDate] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    Promise.all([api.profile(), api.categories()])
      .then(([profile, cats]) => {
        setUser(profile)
        setCategories(cats)
        setScreen('home')
      })
      .catch(() => {
        clearTokens()
      })
  }, [])

  function handleLogin(u: User) {
    setUser(u)
    api.categories().then(setCategories).catch(() => {})
    setScreen('home')
  }

  function handleRegister(u: User) {
    setUser(u)
    api.categories().then(setCategories).catch(() => {})
    setScreen('home')
  }

  function handleLogout() {
    clearTokens()
    setUser(null)
    setCategories([])
    setScreen('splash')
  }

  function renderPage() {
    switch (screen) {
      case 'splash':
        return <SplashPage onEnter={() => setScreen('login')} />
      case 'login':
        return (
          <LoginPage
            onLogin={handleLogin}
            onGoRegister={() => setScreen('register')}
          />
        )
      case 'register':
        return (
          <RegisterPage
            onRegister={handleRegister}
            onGoLogin={() => setScreen('login')}
          />
        )
      case 'home':
        return <HomePage categories={categories} onNavigate={setScreen} />
      case 'calendar':
        return <CalendarPage onViewDayDetail={(date) => { setSelectedDate(date); setScreen('day-detail') }} />
      case 'day-detail':
        return <DayDetailPage date={selectedDate} categories={categories} onBack={() => setScreen('calendar')} />
      case 'stats':
        return <StatsPage />
      case 'profile':
        return (
          <ProfilePage
            user={user}
            onLogout={handleLogout}
            onNavigate={setScreen}
            onUserUpdate={setUser}
          />
        )
      case 'ai-chat':
        return <AiChatPage onBack={() => setScreen('profile')} />
      case 'profile-category':
        return <CategorySettingsPage onBack={() => setScreen('profile')} />
      case 'profile-goal':
        return <GoalSettingsPage onBack={() => setScreen('profile')} />
      case 'profile-reminder':
        return <ReminderSettingsPage onBack={() => setScreen('profile')} />
      case 'profile-export':
        return <ExportSettingsPage onBack={() => setScreen('profile')} />
      case 'profile-language':
        return <LanguageSettingsPage onBack={() => setScreen('profile')} />
      case 'profile-about':
        return <AboutPage onBack={() => setScreen('profile')} />
      case 'profile-market-monitor':
        return <MarketMonitorPage />
      default:
        return (
          <div style={{ padding: 24, color: 'var(--text-muted)', textAlign: 'center' }}>
            🚧 {screen} 页面开发中...
          </div>
        )
    }
  }

  return (
    <PageShell screen={screen} onNavigate={setScreen}>
      {renderPage()}
    </PageShell>
  )
}
