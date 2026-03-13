import { db } from '../src/lib/db.js'
import { PRESET_CATEGORIES } from '@animal-daily/shared'
import bcrypt from 'bcryptjs'

async function seed() {
  console.log('🌱 Seeding database...')

  // 创建测试用户
  const passwordHash = await bcrypt.hash('test1234', 12)

  const user = await db.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      passwordHash,
      nickname: '测试用户',
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
  })

  console.log(`✅ Created user: ${user.email}`)
  console.log('🌱 Seed complete.')
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
