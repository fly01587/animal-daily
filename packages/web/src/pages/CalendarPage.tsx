import type { CalendarDay } from '@animal-daily/shared'
import { getLevelMeta } from '@animal-daily/shared'
import { useEffect, useMemo, useState } from 'react'
import type { DailySummaryWithDistribution } from '../api'
import { ApiError, api } from '../api'
import { toDateStringByParts, toDateStringLocal } from '../utils/date'
import styles from './CalendarPage.module.css'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

type CalendarCell = {
  day: number
  date: string
  data?: CalendarDay
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  const day = new Date(year, month - 1, 1).getDay()
  // Convert to: 0 is Monday, ..., 6 is Sunday
  return day === 0 ? 6 : day - 1
}

function todayStr(): string {
  return toDateStringLocal()
}

function toDateStr(year: number, month: number, day: number): string {
  return toDateStringByParts(year, month, day)
}

function formatMinutes(totalMinutes: number): string {
  if (!totalMinutes) return '0m'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h${minutes}m`
}

function formatSummaryDate(date: string, today: string): string {
  const d = new Date(`${date}T00:00:00`)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const suffix = date === today ? '（今天）' : ''
  return `${month}月${day}日${suffix}`
}

export default function CalendarPage({ onViewDayDetail }: { onViewDayDetail?: (date: string) => void }) {
  const now = new Date()
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([])
  const [daySummary, setDaySummary] = useState<DailySummaryWithDistribution | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [error, setError] = useState('')
  const [summaryError, setSummaryError] = useState('')

  const calendarMap = useMemo(() => {
    const map = new Map<string, CalendarDay>()
    for (const item of calendarData) {
      map.set(item.date, item)
    }
    return map
  }, [calendarData])

  useEffect(() => {
    let cancelled = false

    async function fetchCalendar() {
      setError('')
      try {
        const data = await api.calendar(currentYear, currentMonth)
        if (!cancelled) {
          setCalendarData(data)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : '加载日历失败')
        }
      }
    }

    fetchCalendar()

    return () => {
      cancelled = true
    }
  }, [currentYear, currentMonth])

  useEffect(() => {
    let cancelled = false

    async function fetchDaySummary() {
      setSummaryLoading(true)
      setSummaryError('')
      try {
        const data = await api.dailySummary(selectedDate)
        if (!cancelled) {
          setDaySummary(data)
        }
      } catch (e) {
        if (cancelled) return
        if (e instanceof ApiError && e.status === 404) {
          setDaySummary(null)
          return
        }
        setSummaryError(e instanceof ApiError ? e.message : '加载当天摘要失败')
        setDaySummary(null)
      } finally {
        if (!cancelled) {
          setSummaryLoading(false)
        }
      }
    }

    fetchDaySummary()

    return () => {
      cancelled = true
    }
  }, [selectedDate])

  const days = useMemo<(CalendarCell | null)[]>(() => {
    const count = getDaysInMonth(currentYear, currentMonth)
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
    const result: (CalendarCell | null)[] = []

    // Padding for days before start of month
    for (let i = 0; i < firstDay; i++) {
      result.push(null)
    }

    // Days of the month
    for (let i = 1; i <= count; i++) {
      const dateStr = toDateStr(currentYear, currentMonth, i)
      result.push({
        day: i,
        date: dateStr,
        data: calendarMap.get(dateStr),
      })
    }

    // Keep full rows for stable layout
    const rowCount = Math.ceil(result.length / 7)
    const totalCells = rowCount * 7
    while (result.length < totalCells) {
      result.push(null)
    }

    return result
  }, [currentYear, currentMonth, calendarMap])

  const changeMonth = (offset: number) => {
    const base = new Date(currentYear, currentMonth - 1 + offset, 1)
    const nextYear = base.getFullYear()
    const nextMonth = base.getMonth() + 1

    const selectedDay = Number(selectedDate.slice(8, 10)) || 1
    const safeDay = Math.min(selectedDay, getDaysInMonth(nextYear, nextMonth))

    setCurrentYear(nextYear)
    setCurrentMonth(nextMonth)
    setSelectedDate(toDateStr(nextYear, nextMonth, safeDay))
  }

  const handlePrevMonth = () => {
    changeMonth(-1)
  }

  const handleNextMonth = () => {
    changeMonth(1)
  }

  const today = todayStr()
  const selectedDayData = calendarMap.get(selectedDate)
  const summaryLevel = daySummary?.effectiveLevel ?? selectedDayData?.level ?? 2
  const summaryLevelMeta = getLevelMeta(summaryLevel)
  const summaryCount = daySummary?.totalActivities ?? selectedDayData?.count ?? 0
  const summaryMinutes = daySummary?.totalMinutes ?? 0

  return (
    <div className={styles.page}>
      <section className={styles.calendarPanel}>
        <header className={styles.header}>
          <button className={styles.navBtn} onClick={handlePrevMonth} aria-label="上个月">
            ◀
          </button>
          <div className={styles.monthLabel}>{currentYear}年{currentMonth}月</div>
          <button className={styles.navBtn} onClick={handleNextMonth} aria-label="下个月">
            ▶
          </button>
        </header>

        <div className={styles.weekRow}>
          {WEEKDAYS.map((w) => (
            <div key={w} className={styles.weekday}>
              {w}
            </div>
          ))}
        </div>

        <div className={styles.grid}>
          {days.map((d, i) => {
            if (!d) return <div key={`empty-${i}`} className={styles.dayCellEmpty} />

            const isSelected = d.date === selectedDate
            const isToday = d.date === today
            const hasRecords = (d.data?.count ?? 0) > 0
            const dotColor = d.data?.level ? getLevelMeta(d.data.level).color : undefined

            return (
              <button
                key={d.date}
                className={`${styles.dayCell} ${isToday ? styles.dayCellToday : ''} ${
                  isSelected ? styles.dayCellSelected : ''
                }`}
                onClick={() => setSelectedDate(d.date)}
                aria-label={`${d.date}，${hasRecords ? `有${d.data?.count}条记录` : '暂无记录'}`}
              >
                <span className={styles.dayNumber}>{d.day}</span>
                {hasRecords ? (
                  <span className={styles.dot} style={dotColor ? { backgroundColor: dotColor } : undefined} />
                ) : (
                  <span className={styles.dotPlaceholder} />
                )}
              </button>
            )
          })}
        </div>
      </section>

      <section className={styles.daySummary}>
        <div className={styles.daySummaryDate}>{formatSummaryDate(selectedDate, today)}</div>
        <div className={styles.daySummaryRecords}>
          <div className={styles.dayInfo}>
            <div className={styles.dayLevel}>
              等级:
              <span className={styles.levelChip} style={{ color: summaryLevelMeta.color }}>
                {summaryLevelMeta.icon} {summaryLevelMeta.name}
              </span>
            </div>
            <div className={styles.dayTime}>
              事项: {summaryCount}件 · {formatMinutes(summaryMinutes)}
            </div>
          </div>
          <button
            type="button"
            className={styles.dayLook}
            disabled={summaryCount === 0 || !onViewDayDetail}
            title={summaryCount === 0 ? '当天暂无记录' : '查看当天详情'}
            onClick={() => onViewDayDetail?.(selectedDate)}
          >
            查看详情
          </button>
        </div>
        {summaryLoading && <div className={styles.summaryHint}>正在加载当天摘要...</div>}
        {summaryError && <div className={styles.summaryError}>{summaryError}</div>}
      </section>

      {error && <p style={{ color: 'var(--danger)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>{error}</p>}
    </div>
  )
}
