import type { Activity, Category } from '@animal-daily/shared'
import { useEffect, useMemo, useState } from 'react'
import { ApiError, api } from '../api'
import type { ScreenId } from '../components/PageShell'
import ActivityCard from '../components/ActivityCard'
import AddRecordSheet from '../components/AddRecordSheet'
import LevelCard from '../components/LevelCard'
import RankOverrideSheet from '../components/RankOverrideSheet'
import { toDateStringLocal } from '../utils/date'
import styles from './HomePage.module.css'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function todayStr(): string {
  return toDateStringLocal()
}

function formatDateChinese(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekday = WEEKDAYS[d.getDay()]
  return `${month}月${day}日 周${weekday}`
}

interface HomePageProps {
  categories: Category[]
  onActivitiesChange?: () => void
  onNavigate?: (screen: ScreenId) => void
}

export default function HomePage({ categories, onActivitiesChange, onNavigate }: HomePageProps) {
  const [date] = useState(todayStr)
  const [activities, setActivities] = useState<Activity[]>([])
  const [showSheet, setShowSheet] = useState(false)
  const [showRankSheet, setShowRankSheet] = useState(false)
  const [manualLevel, setManualLevel] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [streakDays] = useState(0)

  const sorted = useMemo(
    () => [...activities].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [activities]
  )

  const totalMinutes = useMemo(
    () => activities.reduce((sum, a) => sum + (a.durationMinutes ?? 0), 0),
    [activities]
  )

  const effectiveLevel = useMemo(() => {
    if (manualLevel !== null) return manualLevel
    if (activities.length === 0) return 2
    const avg = activities.reduce((sum, a) => sum + a.level, 0) / activities.length
    return Math.round(avg)
  }, [activities, manualLevel])

  async function loadActivities() {
    try {
      const list = await api.activities(date)
      setActivities(list)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '加载失败')
    }
  }

  useEffect(() => {
    loadActivities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  async function handleAddDone() {
    setShowSheet(false)
    await loadActivities()
    onActivitiesChange?.()
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.dateText}>{formatDateChinese(date)}</span>
          <p className={styles.streakText}>你已经持续记录了 {streakDays} 天</p>
         
        </div>
        <div className={styles.headerRight}>
          <button className={styles.fab} onClick={() => setShowSheet(true)}>
          ＋ 记录
          </button>
          <button className={styles.bell} aria-label="通知" onClick={() => onNavigate?.('profile-reminder')}>🔔</button>
        </div>
        
      </header>

      <div onClick={() => setShowRankSheet(true)} style={{ cursor: 'pointer' }}>
        <LevelCard
          level={effectiveLevel}
          count={activities.length}
          totalMinutes={totalMinutes}
        />
      </div>

      {error && <p style={{ color: 'var(--danger)', fontSize: 'var(--text-sm)' }}>{error}</p>}

      <div className={styles.activityList}>
        {sorted.length === 0 ? (
          <div className={styles.emptyState}>暂无记录，点击右下角添加</div>
        ) : (
          sorted.map((a) => <ActivityCard key={a.id} activity={a} />)
        )}
      </div>

     
      {showSheet && (
        <AddRecordSheet
          date={date}
          categories={categories}
          onClose={() => setShowSheet(false)}
          onDone={handleAddDone}
        />
      )}
      {showRankSheet && (
        <RankOverrideSheet
          currentLevel={effectiveLevel}
          onSelect={(level) => setManualLevel(level)}
          onClose={() => setShowRankSheet(false)}
        />
      )}
    </div>
  )
}
