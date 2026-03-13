import { db } from '../lib/db.js'
import { LEVEL } from '@animal-daily/shared'

/**
 * 计算某日综合等级（加权平均）
 * 有耗时的按时长加权，无耗时的默认 30 分钟权重
 */
export function calculateDailyLevel(
  activities: { level: number; durationMinutes: number | null }[]
): number {
  if (activities.length === 0) return LEVEL.DONE

  let totalWeight = 0
  let weightedSum = 0

  for (const a of activities) {
    const weight = a.durationMinutes ?? 30
    weightedSum += a.level * weight
    totalWeight += weight
  }

  return Math.round(weightedSum / totalWeight)
}

/**
 * 重新计算并更新某日的 daily_summary
 */
export async function recalculateDailySummary(userId: string, date: Date) {
  const activities = await db.activity.findMany({
    where: { userId, date },
    select: { level: true, durationMinutes: true },
  })

  const autoLevel = calculateDailyLevel(activities)
  const totalMinutes = activities.reduce((sum, a) => sum + (a.durationMinutes ?? 0), 0)

  await db.dailySummary.upsert({
    where: { userId_date: { userId, date } },
    update: {
      autoLevel,
      totalActivities: activities.length,
      totalMinutes,
    },
    create: {
      userId,
      date,
      autoLevel,
      totalActivities: activities.length,
      totalMinutes,
    },
  })
}
