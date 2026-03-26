import { useState } from 'react'
import s from '../styles/settings.module.css'

interface CategorySetting {
  id: string
  icon: string
  label: string
  color: string
  targetMins: number
  enabled: boolean
}

const QUICK_ICONS = ['🧩', '🎨', '🧘', '🧪', '📚', '🏕', '🎯', '🧠']

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

interface Props { onBack: () => void }

export default function CategorySettingsPage({ onBack }: Props) {
  const [items, setItems] = useState<CategorySetting[]>([
    { id: 'work', icon: '💼', label: '工作', color: '#3B82F6', targetMins: 180, enabled: true },
    { id: 'study', icon: '📖', label: '学习', color: '#22C55E', targetMins: 90, enabled: true },
    { id: 'life', icon: '🏠', label: '生活', color: '#F59E0B', targetMins: 120, enabled: true },
    { id: 'exercise', icon: '🏃', label: '运动', color: '#EF4444', targetMins: 45, enabled: true },
    { id: 'play', icon: '🎮', label: '娱乐', color: '#8B5CF6', targetMins: 60, enabled: false },
  ])
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('🧩')
  const [newTarget, setNewTarget] = useState(45)

  function toggleEnabled(id: string) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, enabled: !it.enabled } : it))
  }

  function adjustTarget(id: string, delta: number) {
    setItems(prev => prev.map(it =>
      it.id === id ? { ...it, targetMins: clamp(it.targetMins + delta, 15, 360) } : it
    ))
  }

  function createCategory() {
    if (!newName.trim()) return
    setItems(prev => [...prev, {
      id: `custom-${Date.now()}`,
      icon: newIcon,
      label: newName.trim(),
      color: '#60A5FA',
      targetMins: clamp(Number(newTarget) || 30, 15, 360),
      enabled: true,
    }])
    setNewName('')
    setNewTarget(45)
    setNewIcon('🧩')
    setShowCreate(false)
  }

  return (
    <div className={s.page}>
      <header className={s.head}>
        <button className={s.backBtn} onClick={onBack}>←</button>
        <h3>分类管理</h3>
        <button className={s.textLinkBtn} onClick={() => setShowCreate(v => !v)}>
          {showCreate ? '收起' : '新增'}
        </button>
      </header>

      <article className={s.card}>
        <h4>分类目标节奏</h4>
        <p className={s.tip}>每个分类可以独立启用，并设置建议时长。</p>
        <ul className={s.settingList}>
          {items.map(it => (
            <li key={it.id} className={s.settingRow}>
              <div className={s.settingRowTop}>
                <div className={s.settingName}>{it.icon} {it.label}</div>
                <button
                  className={`${s.miniSwitch} ${it.enabled ? s.miniSwitchOn : ''}`}
                  onClick={() => toggleEnabled(it.id)}
                >
                  {it.enabled ? '启用中' : '已停用'}
                </button>
              </div>
              <div className={s.settingMeta}>
                <i className={s.badgeDot} style={{ background: it.color }} />
                <span>目标时长</span>
                <div className={s.stepper}>
                  <button onClick={() => adjustTarget(it.id, -15)}>-</button>
                  <span>{it.targetMins}m/天</span>
                  <button onClick={() => adjustTarget(it.id, 15)}>+</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </article>

      {showCreate && (
        <article className={s.card}>
          <h4>新增分类</h4>
          <div className={s.inlineField}>
            <span>分类名称</span>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="例如：阅读 / 复盘 / 沟通" />
          </div>
          <div className={s.inlineField}>
            <span>图标选择</span>
            <div className={s.chips}>
              {QUICK_ICONS.map(icon => (
                <button key={icon} className={`${s.chip} ${newIcon === icon ? s.chipActive : ''}`} onClick={() => setNewIcon(icon)}>
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div className={s.inlineField}>
            <span>默认目标（分钟）</span>
            <input type="number" min={15} max={360} step={15} value={newTarget} onChange={e => setNewTarget(Number(e.target.value || 45))} />
          </div>
          <div className={s.actions}>
            <button className={s.ghostBtn} onClick={() => setShowCreate(false)}>取消</button>
            <button className={s.primaryBtn} onClick={createCategory}>保存分类</button>
          </div>
        </article>
      )}
    </div>
  )
}
