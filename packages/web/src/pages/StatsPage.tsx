import { useEffect, useState } from 'react'
import { getLevelMeta, LEVELS } from '@animal-daily/shared'
import { api, ApiError, type MonthlyStats } from '../api'
import styles from './StatsPage.module.css'

export default function StatsPage() {
  const [mode, setMode] = useState<'month' | 'year'>('month')
  const [data, setData] = useState<MonthlyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      setLoading(true)
      setError('')
      try {
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth() + 1
        const summary = await api.monthlyStats(year, month)
        if (!cancelled) setData(summary)
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : '加载失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, []) // 只在挂载时加载一次，mode 切换不重新请求

  const avgLevelMeta = data ? getLevelMeta(data.avgLevel) : null
  const title = mode === 'month' ? '本月概览' : '本年概览（TODO: 聚合 12 个月）'

  if (loading && !data) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>统计</h1>
          <div className={styles.toggle}>
            <button className={`${styles.toggleBtn} ${styles.toggleBtnActive}`}>月</button>
            <button className={styles.toggleBtn}>年</button>
          </div>
        </header>
        <section className={styles.card}>
          <div className={styles.skeleton} style={{ width: '40%', height: 18, marginBottom: 12 }} />
          <div className={styles.skeleton} style={{ width: '60%', height: 14, marginBottom: 8 }} />
          <div className={styles.skeleton} style={{ width: '50%', height: 14, marginBottom: 8 }} />
          <div className={styles.skeleton} style={{ width: '35%', height: 14 }} />
        </section>
        <section className={styles.card}>
          <div className={styles.skeleton} style={{ width: '30%', height: 18, marginBottom: 12 }} />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <div className={styles.skeleton} style={{ width: 70, height: 14 }} />
              <div className={styles.skeleton} style={{ flex: 1, height: 20, borderRadius: 4 }} />
              <div className={styles.skeleton} style={{ width: 30, height: 14 }} />
            </div>
          ))}
        </section>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {error && <p style={{ color: 'var(--danger)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>{error}</p>}
      <header className={styles.header}>
        <h1 className={styles.title}>统计</h1>
        <div className={styles.toggle}>
          <button
            className={`${styles.toggleBtn} ${mode === 'month' ? styles.toggleBtnActive : ''}`}
            onClick={() => setMode('month')}
          >
            月
          </button>
          <button
            className={`${styles.toggleBtn} ${mode === 'year' ? styles.toggleBtnActive : ''}`}
            onClick={() => setMode('year')}
          >
            年
          </button>
        </div>
      </header>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{title}</h2>
        <div className={styles.statItem}>
          <span>平均等级:</span>
          <span className={styles.statValue}>
            {avgLevelMeta?.icon} {avgLevelMeta?.name}
          </span>
        </div>
        <div className={styles.statItem}>
          <span>最佳连续:</span>
          <span className={styles.statValue}>
            {data?.bestStreak ?? 0} 天（ELITE+）
          </span>
        </div>
        <div className={styles.statItem}>
          <span>总活动数:</span>
          <span className={styles.statValue}>{data?.totalActivities ?? 0}</span>
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>等级分布</h2>
        {LEVELS.map((level) => {
          const count = data?.levelDistribution[level.value] ?? 0
          const total = data?.totalActivities || 1
          const percentage = Math.round((count / total) * 100)

          return (
            <div key={level.value} className={styles.levelRow}>
              <div className={styles.levelLabel}>
                {level.icon} {level.name}
              </div>
              <div className={styles.levelBar}>
                <div
                  className={styles.levelBarFill}
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: level.color,
                  }}
                />
              </div>
              <div className={styles.levelPct}>{percentage}%</div>
            </div>
          )
        })}
      </section>
    </div>
  )
}
