import s from '../styles/settings.module.css'

interface Props {
  onBack: () => void
}

export default function AboutPage({ onBack }: Props) {
  return (
    <div className={s.page}>
      <header className={s.head}>
        <button className={s.backBtn} onClick={onBack}>←</button>
        <h3>关于</h3>
        <button className={s.textLinkBtn}>反馈</button>
      </header>

      <section className={s.aboutHero}>
        <div className={s.aboutLogo}>🐾</div>
        <div>
          <h4>Animal Daily</h4>
          <p>Version 0.7.0-beta</p>
        </div>
      </section>

      <article className={s.card}>
        <h4>设计哲学</h4>
        <p className={s.tip}>Living Momentum：用平静层次承载持续行动，让记录自然发生。</p>
        <p className={s.tip}>界面以低噪中性色为基底，等级颜色作为节奏脉冲，减少干扰并保留反馈强度。</p>
      </article>

      <article className={s.card}>
        <h4>信息</h4>
        <ul className={s.aboutList}>
          <li><span>构建设备</span><em>Web Preview</em></li>
          <li><span>设计版本</span><em>Figma v2</em></li>
          <li><span>更新日期</span><em>2026-03-18</em></li>
        </ul>
        <div className={s.actions}>
          <button className={s.ghostBtn}>查看更新日志</button>
          <button className={s.primaryBtn}>检查更新</button>
        </div>
      </article>
    </div>
  )
}
