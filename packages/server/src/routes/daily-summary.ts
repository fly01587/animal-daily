import { LEVEL, calendarQuerySchema, dateQuerySchema, getLevelMeta, updateDailySummarySchema } from '@animal-daily/shared'
import { Hono } from 'hono'
import { db } from '../lib/db.js'
import { authMiddleware, type AuthEnv } from '../middleware/auth.js'

const dailySummary = new Hono<AuthEnv>()

dailySummary.use('*', authMiddleware)

/** 获取某日总结 */
dailySummary.get('/', async (c) => {
  const userId = c.get('userId')
  const { date } = dateQuerySchema.parse(c.req.query())
  const targetDate = new Date(date)
  
  const summary = await db.dailySummary.findUnique({
    where: { userId_date: { userId, date: targetDate } },
  })

  console.log(" 统计的问题 ",targetDate,summary)
  // 获取当日等级分布
  const activities = await db.activity.findMany({
    where: { userId, date: targetDate },
    select: { level: true },
  })

  const levelDistribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  for (const a of activities) {
    levelDistribution[a.level] = (levelDistribution[a.level] ?? 0) + 1
  }

  if (!summary) {
    // 无记录日
    const meta = getLevelMeta(LEVEL.DONE)
    return c.json({
      code: 0,
      data: {
        id: null,
        date,
        autoLevel: LEVEL.DONE,
        manualLevel: null,
        effectiveLevel: LEVEL.DONE,
        effectiveLevelName: meta.name,
        totalActivities: 0,
        totalMinutes: 0,
        note: null,
        levelDistribution,
      },
      message: 'ok',
    })
  }

  const effectiveLevel = summary.manualLevel ?? summary.autoLevel
  const meta = getLevelMeta(effectiveLevel)

  return c.json({
    code: 0,
    data: {
      id: summary.id,
      date,
      autoLevel: summary.autoLevel,
      manualLevel: summary.manualLevel,
      effectiveLevel,
      effectiveLevelName: meta.name,
      totalActivities: summary.totalActivities,
      totalMinutes: summary.totalMinutes,
      note: summary.note,
      levelDistribution,
    },
    message: 'ok',
  })
})

dailySummary.get("/month",async (c) => {
  const userId = c.get('userId')
  const { year, month } = calendarQuerySchema.parse(c.req.query())
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0) // 当月最后一天

  const summaries = await db.dailySummary.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: 'asc' },
  })


  return c.json({ code: 0, data: summaries, message: 'ok' })
})

dailySummary.get('/stats', async (c) => {
  const userId = c.get('userId')
  const { year, month } = calendarQuerySchema.parse(c.req.query())

  const startDate = new Date(year, month - 1, 1)
  const nextMonthStart = new Date(year, month, 1)

  const summaries = await db.dailySummary.findMany({
    where: {
      userId,
      date: { gte: startDate, lt: nextMonthStart },
    },
    orderBy: { date: 'asc' },
    select: {
      date: true,
      autoLevel: true,
      manualLevel: true,
      totalActivities: true,
      totalMinutes: true,
    },
  })

  const activities = await db.activity.findMany({
    where: {
      userId,
      date: { gte: startDate, lt: nextMonthStart },
    },
    select: { level: true },
  })

  const levelDistribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  for (const item of activities) {
    levelDistribution[item.level] = (levelDistribution[item.level] ?? 0) + 1
  }

  let totalActivities = 0
  let totalMinutes = 0
  let activeDays = 0
  let weightedLevelSum = 0

  let bestStreak = 0
  let currentStreak = 0
  let previousDate: Date | null = null

  for (const summary of summaries) {
    const effectiveLevel = summary.manualLevel ?? summary.autoLevel
    totalActivities += summary.totalActivities
    totalMinutes += summary.totalMinutes

    if (summary.totalActivities > 0) {
      activeDays += 1
      weightedLevelSum += effectiveLevel * summary.totalActivities
    }

    const isEliteOrAbove = effectiveLevel >= LEVEL.ELITE
    if (isEliteOrAbove) {
      const currentDate = new Date(summary.date)
      currentDate.setHours(0, 0, 0, 0)

      if (previousDate) {
        const dayDiff = (currentDate.getTime() - previousDate.getTime()) / (24 * 60 * 60 * 1000)
        currentStreak = dayDiff === 1 ? currentStreak + 1 : 1
      } else {
        currentStreak = 1
      }

      previousDate = currentDate
      bestStreak = Math.max(bestStreak, currentStreak)
    } else {
      currentStreak = 0
      previousDate = null
    }
  }

  const avgLevel = totalActivities > 0
    ? Math.max(LEVEL.DONE, Math.min(LEVEL.HANG, Math.round(weightedLevelSum / totalActivities)))
    : LEVEL.DONE

  const data = {
    year,
    month,
    avgLevel,
    levelDistribution,
    bestStreak,
    totalActivities,
    totalMinutes,
    activeDays,
  }

  return c.json({ code: 0, data, message: 'ok' })
})

/** 手动覆盖每日等级 / 添加备注 */
dailySummary.patch('/', async (c) => {
  const userId = c.get('userId')
  const body = updateDailySummarySchema.parse(await c.req.json())
  const targetDate = new Date(body.date)

  await db.dailySummary.upsert({
    where: { userId_date: { userId, date: targetDate } },
    update: {
      ...(body.manualLevel !== undefined && { manualLevel: body.manualLevel }),
      ...(body.note !== undefined && { note: body.note }),
    },
    create: {
      userId,
      date: targetDate,
      autoLevel: LEVEL.DONE,
      manualLevel: body.manualLevel ?? null,
      note: body.note ?? null,
    },
  })

  return c.json({ code: 0, data: null, message: 'ok' })
})

/** 日历视图数据 */
dailySummary.get('/calendar', async (c) => {
  const userId = c.get('userId')
  const { year, month } = calendarQuerySchema.parse(c.req.query())

  // 构造月份范围
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0) // 当月最后一天

  const summaries = await db.dailySummary.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: 'asc' },
  })

  // 构造完整月历数据（每天一条）
  const daysInMonth = endDate.getDate()
  const summaryMap = new Map(
    summaries.map((s) => [s.date.toISOString().slice(0, 10), s])
  )

  const data = []
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day)
    const dateStr = d.toISOString().slice(0, 10)
    const s = summaryMap.get(dateStr)

    if (s) {
      const effectiveLevel = s.manualLevel ?? s.autoLevel
      const meta = getLevelMeta(effectiveLevel)
      data.push({
        date: dateStr,
        level: effectiveLevel,
        levelName: meta.name,
        count: s.totalActivities,
      })
    } else {
      // 判断是否是未来日期
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (d > today) {
        data.push({ date: dateStr, level: 0, levelName: '', count: 0 })
      } else {
        const meta = getLevelMeta(LEVEL.DONE)
        data.push({ date: dateStr, level: LEVEL.DONE, levelName: meta.name, count: 0 })
      }
    }
  }

  return c.json({ code: 0, data, message: 'ok' })
})

export { dailySummary }
