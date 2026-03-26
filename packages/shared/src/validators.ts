// ============================================================
// Animal Daily — Zod 校验 Schema（前后端共用）
// ============================================================

import { z } from 'zod'

// ---- 认证 ----

export const registerSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z
    .string()
    .min(8, '密码至少 8 位')
    .regex(/[a-zA-Z]/, '密码需包含字母')
    .regex(/[0-9]/, '密码需包含数字'),
  nickname: z.string().min(1, '昵称不能为空').max(50, '昵称最多 50 字'),
})

export const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(1, '请输入密码'),
  deviceInfo: z.string().optional(),
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
})

// ---- 事项 ----

export const createActivitySchema = z.object({
  content: z.string().min(1, '内容不能为空').max(500, '内容最多 500 字'),
  level: z.number().int().min(1).max(5),
  categoryId: z.string().uuid().optional().nullable(),
  durationMinutes: z.number().int().positive().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式: YYYY-MM-DD'),
})

export const updateActivitySchema = createActivitySchema.partial()

// ---- 分类 ----

export const createCategorySchema = z.object({
  name: z.string().min(1, '名称不能为空').max(30, '名称最多 30 字'),
  icon: z.string().max(10).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, '颜色格式: #RRGGBB')
    .optional()
    .nullable(),
})

export const updateCategorySchema = createCategorySchema.partial()

export const sortCategoriesSchema = z.object({
  ids: z.array(z.string().uuid()),
})

// ---- 每日总结 ----

export const updateDailySummarySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  manualLevel: z.number().int().min(1).max(5).optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
})

// ---- 用户 ----

export const updateProfileSchema = z.object({
  nickname: z.string().min(1).max(50).optional(),
  avatarUrl: z.string().optional(),
  timezone: z.string().optional(),
  dailyReminderTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, '时间格式: HH:MM')
    .optional(),
  reminderEnabled: z.boolean().optional(),
})

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, '密码至少 8 位')
    .regex(/[a-zA-Z]/, '密码需包含字母')
    .regex(/[0-9]/, '密码需包含数字'),
})

// ---- 查询参数 ----

export const dateQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export const calendarQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
})
