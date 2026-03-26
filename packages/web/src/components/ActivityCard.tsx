import { getLevelMeta } from '@animal-daily/shared'
import type { Activity } from '@animal-daily/shared'
import styles from './ActivityCard.module.css'

interface ActivityCardProps {
  activity: Activity
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h${m}m` : `${h}h`
}

export default function ActivityCard({ activity }: ActivityCardProps) {
  const meta = getLevelMeta(activity.level)

  return (
    <div className={styles.card} style={{ '--card-accent': meta.color } as React.CSSProperties}>
      <div className={styles.time}>{formatTime(activity.createdAt)}</div>
      <div className={styles.body}>
        <div className={styles.content}>{activity.content}</div>
        <div className={styles.meta}>
          <span className={styles.levelDot} style={{ background: meta.color }} />
          <span>{meta.name}</span>
          {activity.categoryIcon && <span>{activity.categoryIcon}</span>}
          {activity.categoryName && <span>{activity.categoryName}</span>}
        </div>
      </div>
      {activity.durationMinutes ? (
        <div className={styles.duration}>{formatDuration(activity.durationMinutes)}</div>
      ) : null}
    </div>
  )
}
