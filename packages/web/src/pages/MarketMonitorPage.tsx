import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, ApiError, type MarketMonitorMetric, type MarketMonitorPayload } from '../api'
import styles from './MarketMonitorPage.module.css'

const RANGE_OPTIONS = [
  { label: '30天', value: 30 },
  { label: '90天', value: 90 },
  { label: '180天', value: 180 },
]

function formatDate(input: string | null): string {
  if (!input) return '--'
  const date = new Date(`${input}T00:00:00`)
  if (Number.isNaN(date.getTime())) return input
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

function formatValue(value: number | null, unit: string): string {
  if (value === null) return '--'
  if (unit === '%') return `${value.toFixed(2)}%`
  if (unit === 'index') return value.toFixed(2)
  if (unit === 'pct') return `${value.toFixed(2)}`
  if (unit === 'tonnes') return `${value.toFixed(2)} 吨`
  return value.toFixed(2)
}

function formatChange(value: number | null, unit: string): string {
  if (value === null) return '--'
  const sign = value > 0 ? '+' : ''
  if (unit === 'tonnes') return `${sign}${value.toFixed(2)} 吨`
  if (unit === '%' || unit === 'pct') return `${sign}${value.toFixed(2)}`
  return `${sign}${value.toFixed(2)}`
}

function trendArrow(trend: MarketMonitorMetric['trend']): string {
  if (trend === 'up') return '↑'
  if (trend === 'down') return '↓'
  if (trend === 'flat') return '→'
  return '·'
}

function Sparkline({ metric }: { metric: MarketMonitorMetric }) {
  const points = metric.history
  if (points.length < 2) {
    return <div className={styles.sparklineEmpty}>数据不足</div>
  }

  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(max - min, 0.0001)

  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100
      const y = 100 - ((point.value - min) / range) * 100
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  return (
    <svg className={styles.sparkline} viewBox="0 0 100 100" preserveAspectRatio="none">
      <path d={path} className={styles.sparklinePath} />
    </svg>
  )
}

export default function MarketMonitorPage() {
  const [days, setDays] = useState(90)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<MarketMonitorPayload | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const payload = await api.marketMonitor(days)
      setData(payload)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '金融监控数据加载失败')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    fetchData().catch(() => {})
  }, [fetchData])

  const updatedAtText = useMemo(() => {
    if (!data?.generatedAt) return '--'
    const date = new Date(data.generatedAt)
    if (Number.isNaN(date.getTime())) return '--'
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(
      date.getMinutes()
    ).padStart(2, '0')}`
  }, [data?.generatedAt])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>金融监控</h1>
          <p className={styles.subtitle}>跟踪黄金相关的4个关键变量</p>
        </div>
        <button className={styles.refreshBtn} onClick={() => fetchData().catch(() => {})}>
          刷新
        </button>
      </header>

      <div className={styles.rangeBar}>
        {RANGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            className={`${styles.rangeBtn} ${days === option.value ? styles.rangeBtnActive : ''}`}
            onClick={() => setDays(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <section className={styles.metaCard}>
        <div>更新时间: {updatedAtText}</div>
        <div>统计区间: 最近 {data?.periodDays ?? days} 天</div>
      </section>

      {loading && <div className={styles.feedback}>加载中...</div>}
      {!loading && error && <div className={styles.error}>{error}</div>}

      {!loading && !error && data?.warnings?.length ? (
        <section className={styles.warningCard}>
          {data.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </section>
      ) : null}

      {!loading && !error && data?.metrics?.length ? (
        <section className={styles.list}>
          {data.metrics.map((metric) => (
            <article key={metric.id} className={styles.metricCard}>
              <div className={styles.metricHead}>
                <div>
                  <h2 className={styles.metricTitle}>{metric.name}</h2>
                  <a className={styles.sourceLink} href={metric.sourceUrl} target="_blank" rel="noreferrer">
                    来源: {metric.source}
                  </a>
                </div>
                <div className={styles.trendWrap}>
                  <span className={styles.trendArrow}>{trendArrow(metric.trend)}</span>
                </div>
              </div>

              <div className={styles.metricsGrid}>
                <div>
                  <div className={styles.label}>最新值</div>
                  <div className={styles.value}>{formatValue(metric.latestValue, metric.unit)}</div>
                  <div className={styles.meta}>{formatDate(metric.latestDate)}</div>
                </div>
                <div>
                  <div className={styles.label}>较前值变化</div>
                  <div className={styles.value}>{formatChange(metric.change, metric.unit)}</div>
                  <div className={styles.meta}>
                    环比 {metric.changePct === null ? '--' : `${metric.changePct.toFixed(2)}%`}
                  </div>
                </div>
              </div>

              <div className={styles.impact}>{metric.goldImpact}</div>

              <div className={styles.sparklineWrap}>
                <Sparkline metric={metric} />
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  )
}
