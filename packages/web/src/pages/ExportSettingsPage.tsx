import { useState } from 'react'
import { getLevelMeta, type Activity } from '@animal-daily/shared'
import { api } from '../api'
import s from '../styles/settings.module.css'

interface ExportSetting {
  range: '7d' | '30d' | '90d'
  format: 'csv' | 'json' | 'pdf'
  includeTimeline: boolean
  includeStats: boolean
  includeGoals: boolean
}

interface ExportRecord {
  id: string
  time: string
  range: string
  format: string
  size: string
  status: 'done' | 'generating'
}

interface Props { onBack: () => void }

export default function ExportSettingsPage({ onBack }: Props) {
  const [setting, setSetting] = useState<ExportSetting>({
    range: '30d',
    format: 'csv',
    includeTimeline: true,
    includeStats: true,
    includeGoals: false,
  })
  const [history, setHistory] = useState<ExportRecord[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  function toDateString(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  function csvEscape(value: string | number | null | undefined) {
    if (value === null || value === undefined) return ''
    const text = String(value)
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }

  function buildCsv(activities: Activity[]) {
    const header = ['date', 'time', 'content', 'level', 'levelName', 'category', 'duration']
    const rows = activities.map((activity) => {
      const createdAt = new Date(activity.createdAt)
      const time = Number.isNaN(createdAt.getTime())
        ? ''
        : `${String(createdAt.getHours()).padStart(2, '0')}:${String(createdAt.getMinutes()).padStart(2, '0')}:${String(createdAt.getSeconds()).padStart(2, '0')}`

      return [
        activity.date,
        time,
        activity.content,
        activity.level,
        getLevelMeta(activity.level).name,
        activity.categoryName ?? '',
        activity.durationMinutes ?? '',
      ]
    })

    return [header, ...rows]
      .map((row) => row.map(csvEscape).join(','))
      .join('\n')
  }

  async function fetchActivitiesByRange(range: ExportSetting['range']) {
    const totalDaysMap: Record<ExportSetting['range'], number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
    }

    const totalDays = totalDaysMap[range]
    const today = new Date()
    const activities: Activity[] = []

    for (let offset = totalDays - 1; offset >= 0; offset -= 1) {
      const date = new Date(today)
      date.setHours(0, 0, 0, 0)
      date.setDate(today.getDate() - offset)
      const dayActivities = await api.activities(toDateString(date))
      activities.push(...dayActivities)
    }

    return activities
  }

  async function generateExport() {
    if (setting.format === 'pdf') return

    setIsGenerating(true)
    const rangeMap: Record<ExportSetting['range'], string> = { '7d': '近7天', '30d': '近30天', '90d': '近90天' }
    const now = new Date()
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const id = `EXP-${String(now.getTime()).slice(-6)}`
    const next: ExportRecord = {
      id, time: stamp, range: rangeMap[setting.range],
      format: setting.format.toUpperCase(),
      size: '--',
      status: 'generating',
    }
    setHistory(prev => [next, ...prev].slice(0, 5))

    try {
      const activities = await fetchActivitiesByRange(setting.range)
      const dateToken = toDateString(now)
      const fileName = `animal-daily-${setting.range}-${dateToken}.${setting.format}`

      const blob = setting.format === 'csv'
        ? new Blob([buildCsv(activities)], { type: 'text/csv;charset=utf-8' })
        : new Blob([JSON.stringify(activities, null, 2)], { type: 'application/json;charset=utf-8' })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)

      const sizeText = `${formatBytes(blob.size)} · ${activities.length} 条`
      setHistory(prev => prev.map(it => it.id === id ? { ...it, size: sizeText, status: 'done' } : it))
    } catch {
      setHistory(prev => prev.filter(it => it.id !== id))
      window.alert('导出失败，请稍后重试')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className={s.page}>
      <header className={s.head}>
        <button className={s.backBtn} onClick={onBack}>←</button>
        <h3>数据导出</h3>
        <button className={s.textLinkBtn}>帮助</button>
      </header>

      <article className={s.card}>
        <h4>导出范围</h4>
        <div className={s.chips}>
          {([['7d', '近7天'], ['30d', '近30天'], ['90d', '近90天']] as const).map(([key, label]) => (
            <button
              key={key}
              className={`${s.chip} ${setting.range === key ? s.chipActive : ''}`}
              onClick={() => setSetting(prev => ({ ...prev, range: key }))}
            >
              {label}
            </button>
          ))}
        </div>

        <h4>内容选择</h4>
        <div className={s.checkList}>
          <label><input type="checkbox" checked={setting.includeTimeline} onChange={e => setSetting(prev => ({ ...prev, includeTimeline: e.target.checked }))} />事项时间线</label>
          <label><input type="checkbox" checked={setting.includeStats} onChange={e => setSetting(prev => ({ ...prev, includeStats: e.target.checked }))} />统计结果</label>
          <label><input type="checkbox" checked={setting.includeGoals} onChange={e => setSetting(prev => ({ ...prev, includeGoals: e.target.checked }))} />目标与达成情况</label>
        </div>

        <h4>导出格式</h4>
        <div className={s.chips}>
          {(['csv', 'json', 'pdf'] as const).map(fmt => (
            <button
              key={fmt}
              className={`${s.chip} ${setting.format === fmt ? s.chipActive : ''} ${fmt === 'pdf' ? s.chipDisabled : ''}`}
              onClick={() => {
                if (fmt === 'pdf') return
                setSetting(prev => ({ ...prev, format: fmt }))
              }}
              disabled={fmt === 'pdf'}
              title={fmt === 'pdf' ? 'PDF 导出开发中' : undefined}
            >
              {fmt.toUpperCase()}
            </button>
          ))}
        </div>
        <button className={s.primaryBtnFull} onClick={generateExport} disabled={isGenerating || setting.format === 'pdf'}>
          {isGenerating ? '生成中...' : '生成导出文件'}
        </button>
      </article>

      <article className={s.card}>
        <h4>导出记录</h4>
        <ul className={s.settingList}>
          {history.map(it => (
            <li key={it.id} className={s.settingRow}>
              <div className={s.settingRowTop}>
                <div className={s.settingName}>{it.id}</div>
                <span className={`${s.statusTag} ${it.status === 'done' ? s.statusTagDone : s.statusTagGenerating}`}>
                  {it.status === 'done' ? '已完成' : '生成中'}
                </span>
              </div>
              <div className={s.settingMeta}>
                <span>{it.time}</span>
                <span>{it.range}</span>
                <span>{it.format}</span>
                <span>{it.size}</span>
              </div>
            </li>
          ))}
        </ul>
      </article>
    </div>
  )
}
