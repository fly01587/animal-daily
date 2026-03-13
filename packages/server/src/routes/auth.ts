import { Hono } from 'hono'

import { AppError } from '../middleware/error.js'

import { db } from '../lib/db.js'
import { signAccessToken, generateRefreshToken } from '../lib/jwt.js'
import { registerSchema, loginSchema, refreshTokenSchema } from '@animal-daily/shared'
import { PRESET_CATEGORIES } from '@animal-daily/shared'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'

const auth = new Hono()

/** 注册 */
auth.post('/register', async (c) => {
  const body = registerSchema.parse(await c.req.json())

  const existing = await db.user.findUnique({ where: { email: body.email } })
  if (existing) {
    throw new AppError(40001, '邮箱已被注册')
  }

  const passwordHash = await bcrypt.hash(body.password, 12)

  const user = await db.user.create({
    data: {
      email: body.email,
      passwordHash,
      nickname: body.nickname,
      // 创建预设分类
      categories: {
        create: PRESET_CATEGORIES.map((cat, i) => ({
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          isPreset: true,
          sortOrder: i,
        })),
      },
    },
    select: {
      id: true,
      email: true,
      nickname: true,
      avatarUrl: true,
      timezone: true,
      createdAt: true,
    },
  })

  const accessToken = await signAccessToken({ sub: user.id, email: user.email })
  const refreshToken = generateRefreshToken()
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')

  await db.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  return c.json({
    code: 0,
    data: { user, accessToken, refreshToken },
    message: 'ok',
  })
})

/** 登录 */
auth.post('/login', async (c) => {
  const body = loginSchema.parse(await c.req.json())

  const user = await db.user.findUnique({
    where: { email: body.email },
    select: {
      id: true,
      email: true,
      nickname: true,
      avatarUrl: true,
      timezone: true,
      passwordHash: true,
      createdAt: true,
    },
  })

  if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
    throw new AppError(40001, '邮箱或密码错误', 401)
  }

  const { passwordHash: _, ...safeUser } = user

  const accessToken = await signAccessToken({ sub: user.id, email: user.email })
  const refreshToken = generateRefreshToken()
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')

  await db.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      deviceInfo: body.deviceInfo,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  return c.json({
    code: 0,
    data: { user: safeUser, accessToken, refreshToken },
    message: 'ok',
  })
})

/** 刷新 Token */
auth.post('/refresh', async (c) => {
  const body = refreshTokenSchema.parse(await c.req.json())
  const tokenHash = crypto.createHash('sha256').update(body.refreshToken).digest('hex')

  const stored = await db.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true } } },
  })

  if (!stored || stored.expiresAt < new Date()) {
    if (stored) await db.refreshToken.delete({ where: { id: stored.id } })
    throw new AppError(40002, '刷新令牌无效或已过期', 401)
  }

  // 轮转: 删旧签新
  await db.refreshToken.delete({ where: { id: stored.id } })

  const accessToken = await signAccessToken({ sub: stored.user.id, email: stored.user.email })
  const newRefreshToken = generateRefreshToken()
  const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex')

  await db.refreshToken.create({
    data: {
      userId: stored.user.id,
      tokenHash: newTokenHash,
      deviceInfo: stored.deviceInfo,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  return c.json({
    code: 0,
    data: { accessToken, refreshToken: newRefreshToken },
    message: 'ok',
  })
})

/** 登出 */
auth.post('/logout', async (c) => {
  const body = refreshTokenSchema.parse(await c.req.json())
  const tokenHash = crypto.createHash('sha256').update(body.refreshToken).digest('hex')

  await db.refreshToken.deleteMany({ where: { tokenHash } })

  return c.json({ code: 0, data: null, message: 'ok' })
})

export { auth }
