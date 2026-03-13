// ============================================================
// Animal Daily — 等级常量定义
// ============================================================

/** 等级数值（数据库存储值） */
export const LEVEL = {
  HANG: 5,    // 夯
  TOP: 4,     // 顶级
  ELITE: 3,   // 人上人
  NPC: 2,     // NPC
  DONE: 1,    // 拉完了
} as const

export type LevelValue = (typeof LEVEL)[keyof typeof LEVEL]

/** 等级元数据 */
export interface LevelMeta {
  value: LevelValue
  name: string
  icon: string
  color: string
}

/** 等级列表（从高到低） */
export const LEVELS: readonly LevelMeta[] = [
  { value: LEVEL.HANG,  name: '夯',    icon: '🔥', color: '#FF6B35' },
  { value: LEVEL.TOP,   name: '顶级',  icon: '⭐', color: '#8B5CF6' },
  { value: LEVEL.ELITE, name: '人上人', icon: '💪', color: '#22C55E' },
  { value: LEVEL.NPC,   name: 'NPC',   icon: '😐', color: '#9CA3AF' },
  { value: LEVEL.DONE,  name: '拉完了', icon: '💀', color: '#DC2626' },
] as const

/** 根据数值获取等级元数据 */
export function getLevelMeta(value: number): LevelMeta {
  return LEVELS.find(l => l.value === value) ?? LEVELS[LEVELS.length - 1]!
}

/** 预设分类 */
export const PRESET_CATEGORIES = [
  { name: '工作', icon: '💼', color: '#3B82F6' },
  { name: '学习', icon: '📖', color: '#8B5CF6' },
  { name: '生活', icon: '🏠', color: '#22C55E' },
  { name: '娱乐', icon: '🎮', color: '#F59E0B' },
  { name: '运动', icon: '🏃', color: '#EF4444' },
  { name: '其他', icon: '📦', color: '#6B7280' },
] as const
