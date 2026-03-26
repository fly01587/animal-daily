import { useState } from 'react'
import s from '../styles/settings.module.css'

const LANG_OPTIONS = [
  { key: 'zh', label: '简体中文', locale: 'zh-CN', hint: '默认推荐' },
  { key: 'en', label: 'English', locale: 'en-US', hint: 'International' },
  { key: 'ja', label: '日本語', locale: 'ja-JP', hint: '日本向け' },
  { key: 'vi', label: 'Tiếng Việt', locale: 'vi-VN', hint: 'Vietnam' },
]

interface Props { onBack: () => void }

export default function LanguageSettingsPage({ onBack }: Props) {
  const [lang, setLang] = useState('zh')
  const [followSystem, setFollowSystem] = useState(true)
  const selected = LANG_OPTIONS.find(it => it.key === lang)

  return (
    <div className={s.page}>
      <header className={s.head}>
        <button className={s.backBtn} onClick={onBack}>←</button>
        <h3>语言</h3>
        <button
          className={`${s.miniSwitch} ${followSystem ? s.miniSwitchOn : ''}`}
          onClick={() => setFollowSystem(v => !v)}
        >
          {followSystem ? '跟随系统' : '手动选择'}
        </button>
      </header>

      <article className={s.card}>
        <h4>界面语言</h4>
        <ul className={s.langList}>
          {LANG_OPTIONS.map(it => (
            <li key={it.key}>
              <button
                className={`${s.langItem} ${lang === it.key ? s.langItemActive : ''}`}
                onClick={() => setLang(it.key)}
              >
                <div>
                  <strong>{it.label}</strong>
                  <small>{it.locale} · {it.hint}</small>
                </div>
                <span>{lang === it.key ? '✓' : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      </article>

      <article className={s.card}>
        <h4>预览</h4>
        <p className={s.tip}>当前语言：{selected?.label || '简体中文'}</p>
        <div className={s.previewBox}>
          <p>今天的状态由你定义，先记录，再优化节奏。</p>
        </div>
      </article>
    </div>
  )
}
