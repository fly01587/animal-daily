// ============================================================
// Animal Daily — 共享类型定义
// ============================================================

import type { LevelValue } from './constants.js'

/** 用户 */
export interface User {
  id: string
  email: string
  nickname: string
  avatarUrl: string | null
  timezone: string
  dailyReminderTime: string
  reminderEnabled: boolean
  createdAt: string
}

/** 分类 */
export interface Category {
  id: string
  name: string
  icon: string | null
  color: string | null
  isPreset: boolean
  sortOrder: number
}

/** 事项 */
export interface Activity {
  id: string
  content: string
  level: LevelValue
  categoryId: string | null
  categoryName: string | null
  categoryIcon: string | null
  durationMinutes: number | null
  date: string
  createdAt: string
}

/** 每日总结 */
export interface DailySummary {
  id: string
  date: string
  autoLevel: LevelValue
  manualLevel: LevelValue | null
  effectiveLevel: LevelValue
  effectiveLevelName: string
  totalActivities: number
  totalMinutes: number
  note: string | null
}

/** 月度统计 */
export interface MonthlyStats {
  year: number
  month: number
  avgLevel: LevelValue
  levelDistribution: Record<number, number>
  bestStreak: number
  totalActivities: number
  totalMinutes: number
  activeDays: number
}

/** 日历项 */
export interface CalendarDay {
  date: string
  level: LevelValue
  levelName: string
  count: number
}

/** 通用 API 响应 */
export interface ApiResponse<T = unknown> {
  code: number
  data: T
  message: string
}

/** 分页响应 */
export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

/** 认证 Token 对 */
export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

/** 登录/注册响应 */
export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}
