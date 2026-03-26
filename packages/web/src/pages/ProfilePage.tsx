import { useEffect, useRef, useState } from 'react'
import type { User } from '@animal-daily/shared'
import { api, clearTokens } from '../api'
import type { ScreenId, ProfileSubScreen } from '../components/PageShell'
import styles from './ProfilePage.module.css'

interface ProfilePageProps {
  user: User | null
  onLogout: () => void
  onNavigate: (screen: ScreenId) => void
  onUserUpdate: (user: User) => void
}

type ProfileMenuScreen = ProfileSubScreen | 'ai-chat'

const MENU_ITEMS: { icon: string; label: string; sub: string; screen: ProfileMenuScreen }[] = [
  { icon: '🤖', label: 'AI 助手', sub: '聊天问答、复盘建议与行动拆解', screen: 'ai-chat' },
  { icon: '📈', label: '金融监控', sub: '黄金相关变量、趋势与预警', screen: 'profile-market-monitor' },
  { icon: '📋', label: '分类管理', sub: '分类开关、图标与目标时长', screen: 'profile-category' },
  { icon: '🎯', label: '我的目标', sub: '设置日/周/月挑战与进度', screen: 'profile-goal' },
  { icon: '🔔', label: '提醒设置', sub: '每日提醒、周报、免打扰', screen: 'profile-reminder' },
  { icon: '📤', label: '数据导出', sub: '导出记录、统计和目标数据', screen: 'profile-export' },
  { icon: '🌐', label: '语言', sub: '界面语言与跟随系统', screen: 'profile-language' },
  { icon: 'ℹ️', label: '关于', sub: '版本信息、设计理念与更新', screen: 'profile-about' },
]

const AVATAR_CHOICES = ['🙂', '😎', '🦁', '🐱', '🐶', '🦊', '🐼', '🐯', '🐸', '🦄', '🐲', '🐻', '🐵', '🐧', '🦋', '🌸', '🌟', '💎', '🔥', '🎯']

export default function ProfilePage({ user, onLogout, onNavigate, onUserUpdate }: ProfilePageProps) {
  const [editingNickname, setEditingNickname] = useState(false)
  const [nicknameValue, setNicknameValue] = useState(user?.nickname ?? '')
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [savingNickname, setSavingNickname] = useState(false)
  const [savingAvatar, setSavingAvatar] = useState(false)
  const avatarPickerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setNicknameValue(user?.nickname ?? '')
  }, [user?.nickname])

  useEffect(() => {
    if (!showAvatarPicker) return

    const onMouseDown = (event: MouseEvent) => {
      if (!avatarPickerRef.current?.contains(event.target as Node)) {
        setShowAvatarPicker(false)
      }
    }

    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [showAvatarPicker])

  const handleLogout = () => {
    clearTokens()
    onLogout()
  }

  const commitNickname = async () => {
    if (!user || savingNickname) {
      setEditingNickname(false)
      return
    }

    const nextNickname = nicknameValue.trim()
    if (!nextNickname) {
      setNicknameValue(user.nickname)
      setEditingNickname(false)
      return
    }

    if (nextNickname === user.nickname) {
      setEditingNickname(false)
      return
    }

    setSavingNickname(true)
    try {
      const updated = await api.updateProfile({ nickname: nextNickname })
      onUserUpdate(updated)
      setNicknameValue(updated.nickname)
      setEditingNickname(false)
    } catch {
      setNicknameValue(user.nickname)
      window.alert('昵称保存失败，请重试')
    } finally {
      setSavingNickname(false)
    }
  }

  const selectAvatar = async (emoji: string) => {
    if (!user || savingAvatar) return

    setSavingAvatar(true)
    try {
      const updated = await api.updateProfile({ avatarUrl: emoji })
      onUserUpdate(updated)
      setShowAvatarPicker(false)
    } catch {
      window.alert('头像保存失败，请重试')
    } finally {
      setSavingAvatar(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.profileHead}>
        <div className={styles.avatarWrap} ref={avatarPickerRef}>
          <button
            type="button"
            className={styles.avatarBtn}
            onClick={() => setShowAvatarPicker(prev => !prev)}
            disabled={!user || savingAvatar}
            title="编辑头像"
          >
            <div className={styles.avatar}>{user?.avatarUrl || '🙂'}</div>
            <span className={styles.editBadge}>✏️</span>
          </button>
          {showAvatarPicker && (
            <div className={styles.avatarPicker}>
              {AVATAR_CHOICES.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={styles.emojiOption}
                  onClick={() => selectAvatar(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.userNameWrap}>
          {editingNickname ? (
            <input
              className={styles.userNameInput}
              value={nicknameValue}
              onChange={(e) => setNicknameValue(e.target.value)}
              onBlur={commitNickname}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                }
                if (e.key === 'Escape') {
                  setNicknameValue(user?.nickname ?? '')
                  setEditingNickname(false)
                }
              }}
              maxLength={50}
              autoFocus
            />
          ) : (
            <button
              type="button"
              className={styles.userNameBtn}
              onClick={() => setEditingNickname(true)}
              disabled={!user || savingNickname}
              title="编辑昵称"
            >
              <span className={styles.userName}>{user?.nickname || '未登录'}</span>
              <span className={styles.editBadge}>✏️</span>
            </button>
          )}
        </div>
        <div className={styles.userEmail}>{user?.email || ''}</div>
      </div>

      <ul className={styles.menu}>
        {MENU_ITEMS.map((item) => (
          <li
            key={item.screen}
            className={styles.menuItem}
            onClick={() => onNavigate(item.screen)}
          >
            <div className={styles.menuLabel}>
              <div className={styles.menuTitle}>{item.icon} {item.label}</div>
              <small className={styles.menuSub}>{item.sub}</small>
            </div>
            <span className={styles.menuArrow}>›</span>
          </li>
        ))}
      </ul>

      <button className={styles.logoutBtn} onClick={handleLogout}>
        退出登录
      </button>
    </div>
  )
}
