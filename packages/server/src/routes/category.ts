import { Hono } from 'hono'
import { authMiddleware, type AuthEnv } from '../middleware/auth.js'
import { AppError } from '../middleware/error.js'
import { db } from '../lib/db.js'
import { createCategorySchema, updateCategorySchema, sortCategoriesSchema } from '@animal-daily/shared'

const category = new Hono<AuthEnv>()

category.use('*', authMiddleware)

/** 获取分类列表 */
category.get('/', async (c) => {
  const userId = c.get('userId')

  const categories = await db.category.findMany({
    where: { userId },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      icon: true,
      color: true,
      isPreset: true,
      sortOrder: true,
    },
  })

  return c.json({ code: 0, data: categories, message: 'ok' })
})

/** 创建分类 */
category.post('/', async (c) => {
  const userId = c.get('userId')
  const body = createCategorySchema.parse(await c.req.json())

  // 检查同名
  const existing = await db.category.findFirst({
    where: { userId, name: body.name },
  })
  if (existing) throw new AppError(40101, '分类名称已存在')

  // 获取当前最大排序
  const maxSort = await db.category.findFirst({
    where: { userId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  })

  const created = await db.category.create({
    data: {
      userId,
      name: body.name,
      icon: body.icon ?? null,
      color: body.color ?? null,
      sortOrder: (maxSort?.sortOrder ?? 0) + 1,
    },
    select: {
      id: true,
      name: true,
      icon: true,
      color: true,
      isPreset: true,
      sortOrder: true,
    },
  })

  return c.json({ code: 0, data: created, message: 'ok' })
})

/** 更新分类 */
category.patch('/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const body = updateCategorySchema.parse(await c.req.json())

  const existing = await db.category.findFirst({ where: { id, userId } })
  if (!existing) throw new AppError(40401, '分类不存在')

  // 检查重名（排除自身）
  if (body.name) {
    const duplicate = await db.category.findFirst({
      where: { userId, name: body.name, NOT: { id } },
    })
    if (duplicate) throw new AppError(40101, '分类名称已存在')
  }

  const updated = await db.category.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.icon !== undefined && { icon: body.icon }),
      ...(body.color !== undefined && { color: body.color }),
    },
    select: {
      id: true,
      name: true,
      icon: true,
      color: true,
      isPreset: true,
      sortOrder: true,
    },
  })

  return c.json({ code: 0, data: updated, message: 'ok' })
})

/** 删除分类 */
category.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const existing = await db.category.findFirst({ where: { id, userId } })
  if (!existing) throw new AppError(40401, '分类不存在')

  if (existing.isPreset) {
    throw new AppError(40101, '预设分类不能删除')
  }

  // 删除分类，关联事项的 categoryId 会被置为 null（onDelete: SetNull）
  await db.category.delete({ where: { id } })

  return c.json({ code: 0, data: null, message: 'ok' })
})

/** 排序分类 */
category.put('/sort', async (c) => {
  const userId = c.get('userId')
  const body = sortCategoriesSchema.parse(await c.req.json())

  // 批量更新排序
  await db.$transaction(
    body.ids.map((id, index) =>
      db.category.updateMany({
        where: { id, userId },
        data: { sortOrder: index },
      })
    )
  )

  return c.json({ code: 0, data: null, message: 'ok' })
})

export { category }
