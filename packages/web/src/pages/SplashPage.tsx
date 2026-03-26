import styles from './SplashPage.module.css'

interface SplashPageProps {
  onEnter: () => void
}

export default function SplashPage({ onEnter }: SplashPageProps) {
  return (
    <div className={styles.container}>
      <div className={styles.centerBrand}>
        <div className={styles.logoBg}>🐾</div>
        <h2 className={styles.title}>Animal Daily</h2>
        <p className={styles.subtitle}>记录每一天</p>
        <div className={styles.loader} />
      </div>
      <button className={styles.enterBtn} onClick={onEnter}>
        进入登录
      </button>
    </div>
  )
}
