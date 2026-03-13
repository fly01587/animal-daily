# Animal Daily — 技术架构设计

> 版本: 1.0
> 创建日期: 2026-03-12
> 状态: 草稿

---

## 1. 架构总览

```
                    ┌─────────────────┐
                    │   React Native  │
                    │   (iOS + Android)│
                    └────────┬────────┘
                             │ HTTPS
                             ▼
                    ┌─────────────────┐
                    │   Hono (API)    │
                    │   Node.js       │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
           ┌──────────────┐  ┌──────────────┐
           │  PostgreSQL   │  │    Redis     │
           │  (主数据库)    │  │  (缓存/会话)  │
           └──────────────┘  └──────────────┘
```

方案 A 架构: 全栈 TypeScript，自建后端服务。

---

## 2. 技术栈明细

### 2.1 后端 (packages/server)

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 运行时 | Node.js | 20 LTS | 长期支持版本 |
| 框架 | Hono | 4.x | 轻量高性能，边缘计算友好 |
| ORM | Prisma | 6.x | 类型安全，自动迁移 |
| 校验 | Zod | 3.x | 运行时类型校验 |
| 认证 | jose | 5.x | JWT 签发/验证 |
| 加密 | bcryptjs | 2.x | 密码哈希 |
| 数据库 | PostgreSQL | 16 | 主数据库 |
| 缓存 | Redis | 7.x | Token 黑名单、频率限制 |
| 日志 | pino | 9.x | 高性能结构化日志 |
| 测试 | Vitest | 2.x | 单元测试 + 集成测试 |

### 2.2 移动端 (packages/mobile)

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 框架 | React Native | 0.76+ | 跨平台移动端 |
| 工具链 | Expo | 52+ | 简化开发流程 |
| 导航 | Expo Router | 4.x | 文件系统路由 |
| 状态管理 | Zustand | 5.x | 轻量级状态管理 |
| 数据请求 | TanStack Query | 5.x | 缓存、重试、离线支持 |
| 样式 | NativeWind | 4.x | Tailwind CSS for RN |
| 图表 | Victory Native | 41.x | React Native 图表库 |
| 存储 | MMKV | 3.x | 高性能本地存储 |
| 动画 | Reanimated | 3.x | 流畅动画 |
| 测试 | Jest + RNTL | - | 组件测试 |

### 2.3 共享层 (packages/shared)

| 包 | 说明 |
|------|------|
| @animal-daily/types | TypeScript 类型定义 |
| @animal-daily/constants | 等级枚举、颜色、图标映射 |
| @animal-daily/validators | Zod schema（前后端共用校验） |
| @animal-daily/api-client | 类型安全的 API 客户端 |

---

## 3. Monorepo 项目结构

```
animal-daily/
├── docs/                          # 设计文档（当前）
├── packages/
│   ├── server/                    # 后端 API 服务
│   │   ├── src/
│   │   │   ├── index.ts           # 入口，Hono app 启动
│   │   │   ├── routes/            # 路由模块
│   │   │   │   ├── auth.ts        # 认证路由
│   │   │   │   ├── user.ts        # 用户路由
│   │   │   │   ├── activity.ts    # 事项路由
│   │   │   │   ├── category.ts    # 分类路由
│   │   │   │   ├── daily-summary.ts # 每日总结路由
│   │   │   │   ├── stats.ts       # 统计路由（P1）
│   │   │   │   └── goal.ts        # 目标路由（P1）
│   │   │   ├── middleware/        # 中间件
│   │   │   │   ├── auth.ts        # JWT 认证中间件
│   │   │   │   ├── error.ts       # 全局错误处理
│   │   │   │   └── rate-limit.ts  # 频率限制
│   │   │   ├── services/          # 业务逻辑层
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── activity.service.ts
│   │   │   │   ├── daily-summary.service.ts
│   │   │   │   └── stats.service.ts
│   │   │   ├── lib/               # 工具库
│   │   │   │   ├── db.ts          # Prisma 客户端
│   │   │   │   ├── redis.ts       # Redis 客户端
│   │   │   │   ├── jwt.ts         # JWT 工具
│   │   │   │   └── logger.ts      # 日志
│   │   │   └── types/             # 服务端专用类型
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # 数据库 schema
│   │   │   ├── migrations/        # 迁移文件
│   │   │   └── seed.ts            # 种子数据
│   │   ├── tests/                 # 测试
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── mobile/                    # React Native 移动端
│   │   ├── app/                   # Expo Router 页面
│   │   │   ├── (auth)/            # 认证相关页面
│   │   │   │   ├── login.tsx
│   │   │   │   └── register.tsx
│   │   │   ├── (tabs)/            # Tab 导航页面
│   │   │   │   ├── _layout.tsx    # Tab 布局
│   │   │   │   ├── index.tsx      # 首页（今日）
│   │   │   │   ├── calendar.tsx   # 日历页
│   │   │   │   ├── stats.tsx      # 统计页
│   │   │   │   └── profile.tsx    # 我的页
│   │   │   ├── day/
│   │   │   │   └── [date].tsx     # 某日详情
│   │   │   ├── categories.tsx     # 分类管理
│   │   │   └── _layout.tsx        # 根布局
│   │   ├── components/            # 组件
│   │   │   ├── activity/          # 事项相关组件
│   │   │   │   ├── ActivityCard.tsx
│   │   │   │   ├── ActivityForm.tsx
│   │   │   │   └── ActivityTimeline.tsx
│   │   │   ├── level/             # 等级相关组件
│   │   │   │   ├── LevelBadge.tsx
│   │   │   │   ├── LevelPicker.tsx
│   │   │   │   └── LevelCard.tsx
│   │   │   ├── calendar/          # 日历组件
│   │   │   │   └── MonthCalendar.tsx
│   │   │   └── ui/                # 通用 UI 组件
│   │   │       ├── Button.tsx
│   │   │       ├── BottomSheet.tsx
│   │   │       └── Toast.tsx
│   │   ├── stores/                # Zustand stores
│   │   │   ├── auth.store.ts
│   │   │   └── app.store.ts
│   │   ├── hooks/                 # 自定义 hooks
│   │   │   ├── useActivities.ts   # TanStack Query hooks
│   │   │   ├── useDailySummary.ts
│   │   │   └── useAuth.ts
│   │   ├── lib/                   # 工具
│   │   │   ├── api.ts             # API 客户端实例
│   │   │   └── storage.ts         # MMKV 存储
│   │   ├── app.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── shared/                    # 共享包
│       ├── src/
│       │   ├── types.ts           # 共享类型
│       │   ├── constants.ts       # 等级枚举、颜色映射
│       │   ├── validators.ts      # Zod 校验 schema
│       │   └── api-client.ts      # 类型安全 API 客户端
│       ├── package.json
│       └── tsconfig.json
│
├── package.json                   # 根配置（pnpm workspace）
├── pnpm-workspace.yaml
├── tsconfig.base.json             # 共享 TS 配置
├── .gitignore
├── .env.example
└── README.md
```

---

## 4. 后端架构分层

```
请求 → 中间件(认证/限流/日志) → 路由 → 服务层 → Prisma → PostgreSQL
                                              ↕
                                           Redis(缓存)
```

| 层级 | 职责 | 规则 |
|------|------|------|
| Routes | 请求解析、参数校验、响应格式化 | 不含业务逻辑 |
| Services | 业务逻辑、数据组装 | 不直接处理 HTTP |
| Prisma | 数据访问 | 只在 Service 层调用 |
| Middleware | 横切关注点 | 认证、日志、错误处理 |

---

## 5. 认证流程

```
登录/注册
    │
    ▼
生成 Access Token (15min) + Refresh Token (30天)
    │
    ├── Access Token → 请求头 Authorization: Bearer xxx
    │   └── 过期 → 客户端用 Refresh Token 换新
    │
    └── Refresh Token → 安全存储 (MMKV)
        └── 过期 → 重新登录
```

- Access Token: JWT, 15 分钟有效期, 包含 userId
- Refresh Token: 随机字符串, 30 天有效期, 哈希后存数据库
- Token 刷新: 旧 Refresh Token 作废，签发新的一对（轮转）
- 登出: Refresh Token 从数据库删除

---

## 6. 部署方案

### 6.1 开发环境

```
本地 PostgreSQL (Docker) + 本地 Redis (Docker) + Node.js dev server
移动端: Expo Go (手机扫码调试)
```

docker-compose.dev.yml:
```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: animal_daily
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev123
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

volumes:
  pgdata:
```

### 6.2 生产环境（初期）

| 服务 | 方案 | 费用 |
|------|------|------|
| API 服务 | Railway / Fly.io | 免费额度 |
| PostgreSQL | Railway / Supabase | 免费额度 |
| Redis | Upstash | 免费额度 |
| 文件存储 | Cloudflare R2 | 免费 10GB |
| 移动端 | Expo EAS Build | 免费额度 |

### 6.3 生产环境（方案 C 迁移后）

| 服务 | 方案 |
|------|------|
| 后端 + 数据库 + 认证 | Supabase (一站式) |
| Web 前端 | Vercel |
| 移动端 | Expo + Supabase SDK |

---

## 7. 环境变量

```env
# 数据库
DATABASE_URL=postgresql://user:pass@localhost:5432/animal_daily

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-min-32-chars
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d

# 服务
PORT=3000
NODE_ENV=development

# 文件存储（P1）
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY=xxx
R2_SECRET_KEY=xxx
R2_BUCKET=animal-daily
```

---

## 8. 关键技术决策记录

| 决策 | 选择 | 原因 |
|------|------|------|
| API 框架 | Hono (非 Express/Fastify) | 更轻量，类型推导更好，边缘计算友好 |
| ORM | Prisma (非 Drizzle/TypeORM) | 生态成熟，迁移工具完善，类型安全 |
| 移动端框架 | Expo (非 bare RN) | 开发效率高，OTA 更新，EAS 构建 |
| 状态管理 | Zustand (非 Redux/MobX) | 轻量，无 boilerplate，RN 友好 |
| 数据请求 | TanStack Query (非 SWR) | 离线支持更好，mutation 管理更强 |
| 包管理 | pnpm (非 npm/yarn) | workspace 支持好，磁盘效率高 |
| 本地存储 | MMKV (非 AsyncStorage) | 性能高 30x，同步 API |
