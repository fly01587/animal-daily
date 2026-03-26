import { useState } from 'react'
import s from '../styles/settings.module.css'

interface ReminderSetting {
  dailyReminder: boolean
  reminderTime: string
  weeklyDigest: boolean
  rankReview: boolean
  quietMode: boolean
  quietStart: string
  quietEnd: string
  weekdays: number[]
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

interface Props { onBack: () => void }

export default function ReminderSettingsPage({ onBack }: Props) {
  const [reminder, setReminder] = useState<ReminderSetting>({
    dailyReminder: true,
    reminderTime: '21:30',
    weeklyDigest: true,
    rankReview: true,
    quietMode: true,
    quietStart: '23:30',
    quietEnd: '07:30',
    weekdays: [1, 2, 3, 4, 5, 0],
  })

  function toggleWeekday(day: number) {
    setReminder(prev => {
      const has = prev.weekdays.includes(day)
      return {
        ...prev,
        weekdays: has ? prev.weekdays.filter(d => d !== day) : [...prev.weekdays, day].sort((a, b) => a - b),
      }
    })
  }

  return (
    <div className={s.page}>
      <header className={s.head}>
        <button className={s.backBtn} onClick={onBack}>←</button>
        <h3>提醒设置</h3>
        <button
          className={s.textLinkBtn}
          onClick={() => setReminder(prev => ({ ...prev, dailyReminder: !prev.dailyReminder }))}
        >
          {reminder.dailyReminder ? '总开关: 开' : '总开关: 关'}
        </button>
      </header>

      <article className={s.card}>
        <div className={s.toggleRow}>
          <div>
            <strong>每日提醒</strong>
            <p>每天固定时间提醒记录当天事项</p>
          </div>
          <button
            className={`${s.miniSwitch} ${reminder.dailyReminder ? s.miniSwitchOn : ''}`}
            onClick={() => setReminder(prev => ({ ...prev, dailyReminder: !prev.dailyReminder }))}
          >
            {reminder.dailyReminder ? '已开启' : '已关闭'}
          </button>
        </div>
        <div className={s.inlineField}>
          <span>提醒时间</span>
          <input type="time" value={reminder.reminderTime} onChange={e => setReminder(prev => ({ ...prev, reminderTime: e.target.value }))} />
        </div>
        <div className={s.inlineField}>
          <span>提醒日期</span>
          <div className={s.dayChips}>
            {WEEKDAY_LABELS.map((day, idx) => (
              <button
                key={day}
                className={`${s.dayChip} ${reminder.weekdays.includes(idx) ? s.dayChipActive : ''}`}
                onClick={() => toggleWeekday(idx)}
              >
                周{day}
              </button>
            ))}
          </div>
        </div>
      </article>

      <article className={s.card}>
        <div className={s.toggleRow}>
          <div>
            <strong>每周总结通知</strong>
            <p>周日晚推送一份本周节奏回顾</p>
          </div>
          <button
            className={`${s.miniSwitch} ${reminder.weeklyDigest ? s.miniSwitchOn : ''}`}
            onClick={() => setReminder(prev => ({ ...prev, weeklyDigest: !prev.weeklyDigest }))}
          >
            {reminder.weeklyDigest ? '开启' : '关闭'}
          </button>
        </div>
        <div className={s.toggleRow}>
          <div>
            <strong>等级波动提醒</strong>
            <p>连续下降时提醒你进行复盘</p>
          </div>
          <button
            className={`${s.miniSwitch} ${reminder.rankReview ? s.miniSwitchOn : ''}`}
            onClick={() => setReminder(prev => ({ ...prev, rankReview: !prev.rankReview }))}
          >
            {reminder.rankReview ? '开启' : '关闭'}
          </button>
        </div>
      </article>

      <article className={s.card}>
        <div className={s.toggleRow}>
          <div>
            <strong>免打扰</strong>
            <p>该时间段不会推送提醒</p>
          </div>
          <button
            className={`${s.miniSwitch} ${reminder.quietMode ? s.miniSwitchOn : ''}`}
            onClick={() => setReminder(prev => ({ ...prev, quietMode: !prev.quietMode }))}
          >
            {reminder.quietMode ? '已启用' : '未启用'}
          </button>
        </div>
        <div className={s.timeInline}>
          <label>开始<input type="time" value={reminder.quietStart} onChange={e => setReminder(prev => ({ ...prev, quietStart: e.target.value }))} /></label>
          <label>结束<input type="time" value={reminder.quietEnd} onChange={e => setReminder(prev => ({ ...prev, quietEnd: e.target.value }))} /></label>
        </div>
      </article>
    </div>
  )
}
