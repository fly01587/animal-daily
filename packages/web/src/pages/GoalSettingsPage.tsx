import { useState } from 'react'
import { LEVELS } from '@animal-daily/shared'
import s from '../styles/settings.module.css'

interface GoalSetting {
  id: string
  title: string
  subtitle: string
  current: number
  target: number
  unit: string
  accent: string
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

interface Props { onBack: () => void }

export default function GoalSettingsPage({ onBack }: Props) {
  const [goalRank, setGoalRank] = useState(4)
  const [goals, setGoals] = useState<GoalSetting[]>([
    { id: 'streak', title: '连续记录', subtitle: '保持每天至少 1 条记录', current: 12, target: 21, unit: '天', accent: '#3B82F6' },
    { id: 'focus', title: '深度专注', subtitle: '本月高质量时长目标', current: 38, target: 60, unit: '小时', accent: '#22C55E' },
    { id: 'fitness', title: '运动投入', subtitle: '每周保持运动节奏', current: 3, target: 5, unit: '次', accent: '#F97316' },
  ])

  function updateProgress(id: string, next: number) {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, current: clamp(Math.round(next), 0, g.target) } : g))
  }

  return (
    <div className={s.page}>
      <header className={s.head}>
        <button className={s.backBtn} onClick={onBack}>←</button>
        <h3>我的目标</h3>
        <button className={s.textLinkBtn}>模版</button>
      </header>

      <article className={s.card}>
        <h4>等级目标</h4>
        <p className={s.tip}>设定你希望本周保持的状态等级。</p>
        <div className={s.chips}>
          {LEVELS.map(lv => (
            <button
              key={lv.value}
              className={`${s.chip} ${goalRank === lv.value ? s.chipActive : ''}`}
              onClick={() => setGoalRank(lv.value)}
            >
              {lv.icon} {lv.name}
            </button>
          ))}
        </div>
      </article>

      {goals.map(goal => {
        const progress = Math.round((goal.current / goal.target) * 100)
        return (
          <article key={goal.id} className={s.card}>
            <div className={s.goalHead}>
              <h4>{goal.title}</h4>
              <span>{goal.current}/{goal.target} {goal.unit}</span>
            </div>
            <p className={s.tip}>{goal.subtitle}</p>
            <div className={s.progressTrack}>
              <div className={s.progressFill} style={{ width: `${Math.min(progress, 100)}%`, background: goal.accent }} />
            </div>
            <div className={s.goalFoot}>
              <small>完成度 {Math.min(progress, 100)}%</small>
              <input type="range" min={0} max={goal.target} value={goal.current} onChange={e => updateProgress(goal.id, Number(e.target.value))} />
            </div>
          </article>
        )
      })}
    </div>
  )
}
