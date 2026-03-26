import { LEVELS } from '@animal-daily/shared'
import type { LevelMeta } from '@animal-daily/shared'
import styles from './RankOverrideSheet.module.css'

interface Props {
  currentLevel: number
  onSelect: (level: number) => void
  onClose: () => void
}

export default function RankOverrideSheet({ currentLevel, onSelect, onClose }: Props) {
  return (
    <div className={styles.mask} onClick={e => e.currentTarget === e.target && onClose()}>
      <section className={styles.sheet}>
        <div className={styles.handle} />
        <h3 className={styles.title}>手动覆盖今日等级</h3>
        <div className={styles.chips}>
          {LEVELS.map((lv: LevelMeta) => (
            <button
              key={lv.value}
              className={`${styles.chip} ${currentLevel === lv.value ? styles.chipActive : ''}`}
              onClick={() => {
                onSelect(lv.value)
                onClose()
              }}
            >
              {lv.icon} {lv.name}
            </button>
          ))}
        </div>
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>取消</button>
        </div>
      </section>
    </div>
  )
}
