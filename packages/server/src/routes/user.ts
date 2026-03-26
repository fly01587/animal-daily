import { Hono } from 'hono'
import { authMiddleware, type AuthEnv } from '../middleware/auth.js'
import { AppError } from '../middleware/error.js'
import { db } from '../lib/db.js'
import { updateProfileSchema, changePasswordSchema } from '@animal-daily/shared'
import bcrypt from 'bcryptjs'

const user = new Hono<AuthEnv>()

user.use('*', authMiddleware)

/** 获取当前用户信息 */
user.get('/profile', async (c) => {
  const userId = c.get('userId')

  const u = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      nickname: true,
      avatarUrl: true,
      timezone: true,
      dailyReminderTime: true,
      reminderEnabled: true,
      createdAt: true,
    },
  })

  if (!u) throw new AppError(40401, '用户不存在', 404)

  return c.json({ code: 0, data: u, message: 'ok' })
})

/** 更新用户信息 */
user.patch('/profile', async (c) => {
  const userId = c.get('userId')
  const body = updateProfileSchema.parse(await c.req.json())

  const updated = await db.user.update({
    where: { id: userId },
    data: {
      ...(body.nickname !== undefined && { nickname: body.nickname }),
      ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl }),
      ...(body.timezone !== undefined && { timezone: body.timezone }),
      ...(body.dailyReminderTime !== undefined && { dailyReminderTime: body.dailyReminderTime }),
      ...(body.reminderEnabled !== undefined && { reminderEnabled: body.reminderEnabled }),
    },
    select: {
      id: true,
      email: true,
      nickname: true,
      avatarUrl: true,
      timezone: true,
      dailyReminderTime: true,
      reminderEnabled: true,
      createdAt: true,
    },
  })

  return c.json({ code: 0, data: updated, message: 'ok' })
})

/** 修改密码 */
user.post('/change-password', async (c) => {
  const userId = c.get('userId')
  const body = changePasswordSchema.parse(await c.req.json())

  const u = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  })

  if (!u) throw new AppError(40401, '用户不存在', 404)

  const valid = await bcrypt.compare(body.oldPassword, u.passwordHash)
  if (!valid) throw new AppError(40001, '原密码错误')

  const newHash = await bcrypt.hash(body.newPassword, 12)
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  })

  return c.json({ code: 0, data: null, message: 'ok' })
})

export { user }
