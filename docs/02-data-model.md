# Animal Daily — 数据模型设计

> 版本: 1.0
> 创建日期: 2026-03-12
> 状态: 草稿

---

## 1. 实体关系总览

```
users ──1:N── activities ──N:1── categories
  │
  │ 1:N
  ▼
daily_summaries
  │
  │ 1:N
  ▼
goals
```

核心关系:
- 一个用户拥有多条事项记录
- 一个用户拥有多条每日总结（每天最多一条）
- 一个用户拥有多个自定义分类
- 每条事项属于一个分类

---

## 2. 等级枚举

```typescript
enum Level {
  HANG = 5,      // 夯
  TOP = 4,       // 顶级
  ELITE = 3,     // 人上人
  NPC = 2,       // NPC
  DONE = 1       // 拉完了
}
```

对应数据库存储为整数 1-5，应用层映射为中文名称和图标。

---

## 3. 表结构定义

### 3.1 users — 用户表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 主键 |
| email | VARCHAR(255) | UNIQUE, NOT NULL | 邮箱（登录凭证） |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt 加密密码 |
| nickname | VARCHAR(50) | NOT NULL | 昵称 |
| avatar_url | VARCHAR(500) | NULLABLE | 头像地址 |
| timezone | VARCHAR(50) | DEFAULT 'Asia/Shanghai' | 用户时区 |
| daily_reminder_time | TIME | DEFAULT '21:00' | 每日提醒时间 |
| reminder_enabled | BOOLEAN | DEFAULT true | 是否开启提醒 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 更新时间 |

索引: `email` (UNIQUE)

### 3.2 categories — 分类表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 主键 |
| user_id | UUID | FK users.id, NOT NULL | 所属用户 |
| name | VARCHAR(30) | NOT NULL | 分类名称 |
| icon | VARCHAR(10) | NULLABLE | 图标（emoji） |
| color | VARCHAR(7) | NULLABLE | 颜色色值 |
| is_preset | BOOLEAN | DEFAULT false | 是否为预设分类 |
| sort_order | INT | DEFAULT 0 | 排序权重 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 创建时间 |

索引: `(user_id, name)` UNIQUE
预设数据: 注册时自动创建 — 工作、学习、生活、娱乐、运动、其他

### 3.3 activities — 事项表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 主键 |
| user_id | UUID | FK users.id, NOT NULL | 所属用户 |
| category_id | UUID | FK categories.id, NULLABLE | 所属分类 |
| content | TEXT | NOT NULL | 事项内容 |
| level | SMALLINT | NOT NULL, CHECK(1-5) | 等级评分 |
| duration_minutes | INT | NULLABLE | 耗时（分钟） |
| date | DATE | NOT NULL | 所属日期 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 更新时间 |

索引:
- `(user_id, date)` — 按日期查询事项
- `(user_id, date, level)` — 统计查询

### 3.4 daily_summaries — 每日总结表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 主键 |
| user_id | UUID | FK users.id, NOT NULL | 所属用户 |
| date | DATE | NOT NULL | 日期 |
| auto_level | SMALLINT | NOT NULL, CHECK(1-5) | 自动计算等级 |
| manual_level | SMALLINT | NULLABLE, CHECK(1-5) | 手动覆盖等级 |
| total_activities | INT | DEFAULT 0 | 事项总数 |
| total_minutes | INT | DEFAULT 0 | 总耗时（分钟） |
| note | TEXT | NULLABLE | 用户备注/感想 |
| ai_summary | TEXT | NULLABLE | AI 生成的总结（P2） |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 更新时间 |

索引: `(user_id, date)` UNIQUE
计算逻辑: `effective_level = manual_level ?? auto_level`

### 3.5 goals — 目标表（P1）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 主键 |
| user_id | UUID | FK users.id, NOT NULL | 所属用户 |
| title | VARCHAR(100) | NOT NULL | 目标标题 |
| target_level | SMALLINT | NOT NULL, CHECK(1-5) | 目标最低等级 |
| target_days | INT | NOT NULL | 目标天数/周 |
| period | VARCHAR(10) | NOT NULL | 周期: weekly / monthly |
| start_date | DATE | NOT NULL | 开始日期 |
| end_date | DATE | NULLABLE | 结束日期（NULL=持续） |
| is_active | BOOLEAN | DEFAULT true | 是否激活 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 创建时间 |

索引: `(user_id, is_active)`

### 3.6 refresh_tokens — 刷新令牌表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 主键 |
| user_id | UUID | FK users.id, NOT NULL | 所属用户 |
| token_hash | VARCHAR(255) | NOT NULL | token 哈希值 |
| device_info | VARCHAR(255) | NULLABLE | 设备信息 |
| expires_at | TIMESTAMPTZ | NOT NULL | 过期时间 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 创建时间 |

索引: `token_hash` (UNIQUE), `(user_id)`

---

## 4. Prisma Schema（方案 A 实现参考）

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                String    @id @default(uuid())
  email             String    @unique
  passwordHash      String    @map("password_hash")
  nickname          String
  avatarUrl         String?   @map("avatar_url")
  timezone          String    @default("Asia/Shanghai")
  dailyReminderTime String    @default("21:00") @map("daily_reminder_time")
  reminderEnabled   Boolean   @default(true) @map("reminder_enabled")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  activities     Activity[]
  categories     Category[]
  dailySummaries DailySummary[]
  goals          Goal[]
  refreshTokens  RefreshToken[]

  @@map("users")
}

model Category {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  name      String
  icon      String?
  color     String?
  isPreset  Boolean  @default(false) @map("is_preset")
  sortOrder Int      @default(0) @map("sort_order")
  createdAt DateTime @default(now()) @map("created_at")

  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  activities Activity[]

  @@unique([userId, name])
  @@map("categories")
}

model Activity {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  categoryId      String?  @map("category_id")
  content         String
  level           Int      // 1-5
  durationMinutes Int?     @map("duration_minutes")
  date            DateTime @db.Date
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  category Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)

  @@index([userId, date])
  @@index([userId, date, level])
  @@map("activities")
}

model DailySummary {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  date            DateTime @db.Date
  autoLevel       Int      @map("auto_level")
  manualLevel     Int?     @map("manual_level")
  totalActivities Int      @default(0) @map("total_activities")
  totalMinutes    Int      @default(0) @map("total_minutes")
  note            String?
  aiSummary       String?  @map("ai_summary")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@map("daily_summaries")
}

model Goal {
  id          String    @id @default(uuid())
  userId      String    @map("user_id")
  title       String
  targetLevel Int       @map("target_level")
  targetDays  Int       @map("target_days")
  period      String    // weekly | monthly
  startDate   DateTime  @map("start_date") @db.Date
  endDate     DateTime? @map("end_date") @db.Date
  isActive    Boolean   @default(true) @map("is_active")
  createdAt   DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isActive])
  @@map("goals")
}

model RefreshToken {
  id         String   @id @default(uuid())
  userId     String   @map("user_id")
  tokenHash  String   @unique @map("token_hash")
  deviceInfo String?  @map("device_info")
  expiresAt  DateTime @map("expires_at")
  createdAt  DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("refresh_tokens")
}
```

---

## 5. 自动计算逻辑

### 5.1 每日综合等级计算

```typescript
function calculateDailyLevel(activities: Activity[]): number {
  if (activities.length === 0) return Level.DONE // 无记录 = 拉完了

  // 有耗时的事项按时长加权，无耗时的按次数平均
  const withDuration = activities.filter(a => a.durationMinutes != null)
  const withoutDuration = activities.filter(a => a.durationMinutes == null)

  let totalWeight = 0
  let weightedSum = 0

  for (const a of withDuration) {
    weightedSum += a.level * a.durationMinutes!
    totalWeight += a.durationMinutes!
  }

  for (const a of withoutDuration) {
    weightedSum += a.level * 30 // 默认 30 分钟权重
    totalWeight += 30
  }

  return Math.round(weightedSum / totalWeight)
}
```

### 5.2 触发时机

- 添加/编辑/删除事项时，重新计算当日 `auto_level`
- 若用户已设置 `manual_level`，展示层优先使用 `manual_level`
