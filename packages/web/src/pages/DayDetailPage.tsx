import type { Activity, Category } from '@animal-daily/shared'
import { getLevelMeta } from '@animal-daily/shared'
import { useEffect, useMemo, useState } from 'react'
import { ApiError, api } from '../api'
import ActivityCard from '../components/ActivityCard'
import LevelCard from '../components/LevelCard'
import styles from './HomePage.module.css'
import s from '../styles/settings.module.css'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function formatDateChinese(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekday = WEEKDAYS[d.getDay()]
  return `${d.getFullYear()}年${month}月${day}日 周${weekday}`
}

interface DayDetailPageProps {
  date: string
  categories: Category[]
  onBack: () => void
}

export default function DayDetailPage({ date, categories, onBack }: DayDetailPageProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const sorted = useMemo(
    () => [...activities].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [activities]
  )

  const totalMinutes = useMemo(
    () => activities.reduce((sum, a) => sum + (a.durationMinutes ?? 0), 0),
    [activities]
  )

  const effectiveLevel = useMemo(() => {
    if (activities.length === 0) return 2
    const avg = activities.reduce((sum, a) => sum + a.level, 0) / activities.length
    return Math.round(avg)
  }, [activities])

  useEffect(() => {
    let cancelled = false

    async function loadActivities() {
      setLoading(true)
      setError('')
      try {
        const list = await api.activities(date)
        if (!cancelled) setActivities(list)
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : '加载失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadActivities()
    return () => { cancelled = true }
  }, [date])

  return (
    <div className={styles.page}>
      <header className={s.head}>
        <button className={s.backBtn} onClick={onBack}>&larr;</button>
        <h3>{formatDateChinese(date)}</h3>
        <div />
      </header>

      <LevelCard
        level={effectiveLevel}
        count={activities.length}
        totalMinutes={totalMinutes}
      />

      {error && <p style={{ color: 'var(--danger)', fontSize: 'var(--text-sm)' }}>{error}</p>}

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40 }}>
          加载中...
        </div>
      ) : (
        <div className={styles.activityList}>
          {sorted.length === 0 ? (
            <div className={styles.emptyState}>当日暂无记录</div>
          ) : (
            sorted.map((a) => <ActivityCard key={a.id} activity={a} />)
          )}
        </div>
      )}
    </div>
  )
}
