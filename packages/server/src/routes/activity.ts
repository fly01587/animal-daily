import { Hono } from 'hono'
import { authMiddleware, type AuthEnv } from '../middleware/auth.js'
import { AppError } from '../middleware/error.js'
import { db } from '../lib/db.js'
import { createActivitySchema, updateActivitySchema, dateQuerySchema } from '@animal-daily/shared'
import { getLevelMeta } from '@animal-daily/shared'
import { recalculateDailySummary } from '../services/daily-summary.service.js'

const activity = new Hono<AuthEnv>()

// 所有事项接口需要认证
activity.use('*', authMiddleware)

/** 获取某日事项列表 */
activity.get('/', async (c) => {
  const userId = c.get('userId')
  const { date } = dateQuerySchema.parse(c.req.query())

  const categoryId = c.req.query('categoryId') ?? undefined
  const levelParam = c.req.query('level')
  const level = levelParam ? Number(levelParam) : undefined

  const activities = await db.activity.findMany({
    where: {
      userId,
      date: new Date(date),
      ...(categoryId && { categoryId }),
      ...(level && { level }),
    },
    include: {
      category: { select: { name: true, icon: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const data = activities.map((a) => {
    const meta = getLevelMeta(a.level)
    return {
      id: a.id,
      content: a.content,
      level: a.level,
      levelName: meta.name,
      categoryId: a.categoryId,
      categoryName: a.category?.name ?? null,
      categoryIcon: a.category?.icon ?? null,
      durationMinutes: a.durationMinutes,
      date: date,
      createdAt: a.createdAt.toISOString(),
    }
  })

  return c.json({ code: 0, data, message: 'ok' })
})

/** 创建事项 */
activity.post('/', async (c) => {
  const userId = c.get('userId')
  const body = createActivitySchema.parse(await c.req.json())

  // 校验日期不超过今天，且允许补录过去 7 天
  const targetDate = new Date(body.date)
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  if (targetDate > today) {
    throw new AppError(40101, '不能记录未来的事项')
  }
  if (targetDate < sevenDaysAgo) {
    throw new AppError(40101, '只能补录过去 7 天的事项')
  }

  // 校验分类归属
  if (body.categoryId) {
    const cat = await db.category.findFirst({
      where: { id: body.categoryId, userId },
    })
    if (!cat) throw new AppError(40401, '分类不存在')
  }

  const created = await db.activity.create({
    data: {
      userId,
      content: body.content,
      level: body.level,
      categoryId: body.categoryId ?? null,
      durationMinutes: body.durationMinutes ?? null,
      date: targetDate,
    },
  })

  // 重新计算当日等级
  await recalculateDailySummary(userId, targetDate)

  return c.json({ code: 0, data: { id: created.id }, message: 'ok' })
})

/** 更新事项 */
activity.patch('/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const body = updateActivitySchema.parse(await c.req.json())

  const existing = await db.activity.findFirst({ where: { id, userId } })
  if (!existing) throw new AppError(40401, '事项不存在')

  // 校验分类归属
  if (body.categoryId) {
    const cat = await db.category.findFirst({
      where: { id: body.categoryId, userId },
    })
    if (!cat) throw new AppError(40401, '分类不存在')
  }

  await db.activity.update({
    where: { id },
    data: {
      ...(body.content !== undefined && { content: body.content }),
      ...(body.level !== undefined && { level: body.level }),
      ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
      ...(body.durationMinutes !== undefined && { durationMinutes: body.durationMinutes }),
    },
  })

  // 重新计算当日等级
  await recalculateDailySummary(userId, existing.date)

  return c.json({ code: 0, data: null, message: 'ok' })
})

/** 删除事项 */
activity.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const existing = await db.activity.findFirst({ where: { id, userId } })
  if (!existing) throw new AppError(40401, '事项不存在')

  await db.activity.delete({ where: { id } })

  // 重新计算当日等级
  await recalculateDailySummary(userId, existing.date)

  return c.json({ code: 0, data: null, message: 'ok' })
})

export { activity }
