import { useEffect, useId, useRef, useState } from 'react'
import type { Category, LevelValue } from '@animal-daily/shared'
import { LEVELS } from '@animal-daily/shared'
import { api, ApiError } from '../api'
import styles from './AddRecordSheet.module.css'

interface AddRecordSheetProps {
  date: string
  categories: Category[]
  onClose: () => void
  onDone: () => void
}

const levelsLowToHigh = [...LEVELS].reverse()
const CLOSE_THRESHOLD = 120
const MINUTES_PER_HOUR = 60
const MAX_MINUTES = 59

function sanitizeNumericInput(value: string): string {
  return value.replace(/\D/g, '')
}

function parseHours(value: string): number {
  const sanitized = sanitizeNumericInput(value)
  if (!sanitized) return 0
  return Number.parseInt(sanitized, 10)
}

function parseMinutes(value: string): number {
  const sanitized = sanitizeNumericInput(value)
  if (!sanitized) return 0
  const parsed = Number.parseInt(sanitized, 10)
  return Math.min(MAX_MINUTES, parsed)
}

function getDurationMinutes(hours: string, minutes: string): number | undefined {
  const totalMinutes = parseHours(hours) * MINUTES_PER_HOUR + parseMinutes(minutes)
  return totalMinutes > 0 ? totalMinutes : undefined
}

export default function AddRecordSheet({ date, categories, onClose, onDone }: AddRecordSheetProps) {
  const [content, setContent] = useState('')
  const [level, setLevel] = useState<LevelValue | null>(null)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [hours, setHours] = useState('0')
  const [minutes, setMinutes] = useState('30')
  const [selectedDate, setSelectedDate] = useState(date)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sheetOffsetY, setSheetOffsetY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dragStartY = useRef(0)
  const draggingPointerId = useRef<number | null>(null)
  const dateInputId = useId()
  const dateInputRef = useRef<HTMLInputElement | null>(null)

  const canSave = content.trim().length > 0 && level !== null && !loading

  useEffect(() => {
    setSelectedDate(date)
  }, [date])

  function handleDragStart(event: React.PointerEvent<HTMLDivElement>) {
    draggingPointerId.current = event.pointerId
    dragStartY.current = event.clientY
    setDragging(true)
    setSheetOffsetY(0)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleDragMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || draggingPointerId.current !== event.pointerId) return
    const deltaY = Math.max(0, event.clientY - dragStartY.current)
    setSheetOffsetY(deltaY)
  }

  function finishDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || draggingPointerId.current !== event.pointerId) return
    draggingPointerId.current = null
    setDragging(false)

    if (sheetOffsetY >= CLOSE_THRESHOLD) {
      onClose()
      return
    }

    setSheetOffsetY(0)
  }

  function openDatePicker() {
    const input = dateInputRef.current
    if (!input) return
    if (typeof input.showPicker === 'function') {
      input.showPicker()
      return
    }
    input.click()
  }

  async function handleSave() {
    if (!canSave || level === null) return
    setLoading(true)
    setError('')
    try {
      await api.addActivity({
        date: selectedDate,
        content: content.trim(),
        level,
        categoryId: categoryId ?? undefined,
        durationMinutes: getDurationMinutes(hours, minutes),
      })
      onDone()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '保存失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.sheet}
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: `translateY(${sheetOffsetY}px)`,
          transition: dragging ? 'none' : 'transform 220ms ease',
        }}
      >
        <div
          className={styles.dragHandle}
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        />
        <h2 className={styles.title}>记录一件事</h2>

        <div className={styles.scrollBody}>
          <div className={styles.label}>内容</div>
          <textarea
            className={styles.textarea}
            placeholder="做了什么..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoFocus
          />

          <div className={styles.label}>等级</div>
          <div className={styles.chips}>
            {levelsLowToHigh.map((lv) => (
              <button
                key={lv.value}
                type="button"
                className={`${styles.chip} ${level === lv.value ? styles.chipActive : ''}`}
                onClick={() => setLevel(level === lv.value ? null : lv.value)}
              >
                {lv.icon} {lv.name}
              </button>
            ))}
          </div>

          <div className={styles.label}>分类</div>
          <div className={styles.chips}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`${styles.chip} ${categoryId === cat.id ? styles.catChipActive : ''}`}
                onClick={() => setCategoryId(categoryId === cat.id ? null : cat.id)}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>

          <div className={styles.durationRow}>
            <div className={styles.durationGroup}>
              <div className={styles.label}>小时</div>
              <input
                className={styles.durationInput}
                type="number"
                min="0"
                value={hours}
                onChange={(e) => setHours(sanitizeNumericInput(e.target.value))}
                onBlur={() => setHours(String(parseHours(hours)))}
              />
            </div>
            <div className={styles.durationGroup}>
              <div className={styles.label}>分钟</div>
              <input
                className={styles.durationInput}
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(sanitizeNumericInput(e.target.value))}
                onBlur={() => setMinutes(String(parseMinutes(minutes)))}
              />
            </div>
          </div>

          <div className={styles.label}>日期</div>
          <div
            className={styles.datePickerWrap}
            role="button"
            tabIndex={0}
            onClick={openDatePicker}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openDatePicker()
              }
            }}
          >
            <div className={styles.dateDisplay}>
              <span>{selectedDate.replace(/-/g, '/')}</span>
              <span className={styles.dateIcon}>📅</span>
            </div>
            <input
              id={dateInputId}
              ref={dateInputRef}
              className={styles.dateInputHidden}
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.buttonRow}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            disabled={!canSave}
            onClick={handleSave}
          >
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
