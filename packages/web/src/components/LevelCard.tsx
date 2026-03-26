import { getLevelMeta } from '@animal-daily/shared'
import styles from './LevelCard.module.css'

interface LevelCardProps {
  level: number
  count: number
  totalMinutes: number
}

function formatTotalTime(minutes: number): string {
  if (minutes <= 0) return '0m'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m > 0 ? `${h}h${m}m` : `${h}h`
}

export default function LevelCard({ level, count, totalMinutes }: LevelCardProps) {
  const meta = getLevelMeta(level)

  return (
    <div className={styles.card}>
      <div className={styles.label}>今日等级</div>
      <div className={styles.levelRow}>
        <span className={styles.levelIcon}>{meta.icon}</span>
        <span className={styles.levelName} style={{ color: meta.color }}>
          {meta.name}
        </span>
      </div>
      <div className={styles.summary}>
        已记录 {count} 件 · {formatTotalTime(totalMinutes)}
      </div>
    </div>
  )
}
