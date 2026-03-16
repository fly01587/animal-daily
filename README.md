# Animal Daily — 每日活动打卡与评级系统

> 用数据回答"今天过得怎么样？"

---

## 项目简介

**Animal Daily** 是一款个人每日活动记录与量化评级的全栈应用。用户可以记录每天完成的事项，并对每条活动打上 1-5 级评分，系统自动加权计算当日综合等级，从而将主观的"今天状态"转化为可追踪、可回顾的数据。

### 核心理念

- **记录**：随手记下当天做了什么
- **评级**：每条活动打分（5 档等级）
- **汇总**：系统自动计算当日综合等级
- **回顾**：日历热力图展示历史表现趋势

---

## 等级体系

| 等级 | 数值 | 图标 | 含义 | 颜色 |
|------|------|------|------|------|
| 夯   | 5    | 🔥   | 超高输出，状态爆炸 | `#FF6B35` |
| 顶级 | 4    | ⭐   | 优秀，超出预期 | `#8B5CF6` |
| 人上人 | 3  | 💪   | 正常发挥，尽力了 | `#22C55E` |
| NPC  | 2    | 😐   | 摆烂，靠惯性 | `#9CA3AF` |
| 拉完了 | 1  | 💀   | 躺平，什么都没做 | `#DC2626` |

**当日等级计算**：以每条活动的时长为权重进行加权平均（未填写时长默认 30 分钟），四舍五入取整。

---

## 技术架构

项目采用 **pnpm monorepo** 结构，包含四个子包：

```
animal-daily/
├── packages/
│   ├── server/     # 后端 API 服务
│   ├── mobile/     # React Native 移动端
│   ├── shared/     # 共享类型、常量、校验器
│   └── web/        # React Web 端（开发中）
├── docs/           # 产品与技术文档
└── docker-compose.dev.yml  # 本地开发环境
```

### 后端（packages/server）

| 技术 | 版本 | 用途 |
|------|------|------|
| Hono | 4.7 | 轻量 HTTP 框架 |
| Prisma | 6.4 | 类型安全 ORM |
| PostgreSQL | 16 | 主数据库 |
| Redis | 7 | Token 缓存与会话 |
| jose (JWT) | 5.9 | 身份认证 |
| Zod | 3.24 | 请求参数校验 |
| Pino | 9.6 | 结构化日志 |

**服务分层**：
```
HTTP 请求 → CORS → 路由层 → 服务层 → Prisma ORM → PostgreSQL
                                              ↕
                                           Redis
```

**API 模块**：
- `/api/v1/auth` — 注册、登录、刷新 Token、登出
- `/api/v1/activities` — 活动 CRUD + 当日汇总触发
- `/api/v1/categories` — 分类管理（增删改、排序）
- `/api/v1/daily-summary` — 每日汇总查询、手动等级覆盖、日历视图
- `/api/v1/user` — 个人资料、设置、修改密码

### 移动端（packages/mobile）

| 技术 | 版本 | 用途 |
|------|------|------|
| React Native + Expo | 0.76 / 52 | 跨平台移动框架 |
| Expo Router | 4.0 | 文件系统路由 |
| Zustand | 5.0 | 全局状态管理 |
| TanStack Query | 5.62 | 服务端状态与缓存 |
| react-native-mmkv | 3.2 | 高性能本地存储 |
| Reanimated | 3.16 | 流畅动画 |

**页面结构**：
```
/ (根布局 — 恢复登录态)
├── (auth)/          # 未登录
│   ├── login        # 登录
│   └── register     # 注册
└── (tabs)/          # 已登录 Tab 导航
    ├── index        # 今日（首页）
    ├── calendar     # 日历
    ├── stats        # 统计（P1）
    └── profile      # 我的
```

### 共享层（packages/shared）

所有包共用：
- **TypeScript 类型**：`User`、`Activity`、`Category`、`DailySummary`、`ApiResponse<T>` 等
- **常量**：等级元数据（名称、图标、颜色）、预置分类（工作、学习、生活、娱乐、运动、其他）
- **Zod 校验 Schema**：前后端共享同一套请求/响应校验规则

---

## 数据模型

```
users ──┬── activities (活动记录：内容、等级、分类、时长、日期)
        ├── categories (自定义分类：名称、图标、颜色)
        ├── daily_summaries (每日汇总：自动等级、手动覆盖、备注)
        ├── goals (目标，P1)
        └── refresh_tokens (登录设备与 Token 轮换)
```

---

## 认证方案

- **Access Token**：JWT（HS256），15 分钟有效期
- **Refresh Token**：64 位随机十六进制，30 天有效期，哈希后存入数据库
- **Token 轮换**：刷新时旧 Token 失效，签发新对
- **移动端存储**：MMKV（同步 API，比 AsyncStorage 快约 30 倍）

---

## 接口响应规范

```json
// 成功
{ "code": 0, "data": { ... }, "message": "ok" }

// 失败
{ "code": 40001, "data": null, "message": "错误描述" }
```

| 错误码范围 | 含义 |
|-----------|------|
| 0 | 成功 |
| 40001–40099 | 认证 / 权限错误 |
| 40101–40199 | 参数校验错误 |
| 40401–40499 | 资源不存在 |
| 50001–50099 | 服务器内部错误 |

---

## 本地开发

### 前置要求

- Node.js ≥ 20
- pnpm ≥ 9
- Docker（用于启动 PostgreSQL 和 Redis）

### 启动步骤

```bash
# 1. 安装依赖
pnpm install

# 2. 启动数据库和缓存
docker-compose -f docker-compose.dev.yml up -d

# 3. 配置环境变量（参考 packages/server/.env.example）
cp packages/server/.env.example packages/server/.env

# 4. 初始化数据库
pnpm --filter server db:push

# 5. 启动后端
pnpm dev:server   # → http://localhost:3000

# 6. 启动移动端
pnpm dev:mobile   # → Expo Go
```

### 环境变量（server）

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 连接串 | `postgresql://dev:dev123@localhost:5432/animal_daily` |
| `REDIS_URL` | Redis 连接串 | `redis://localhost:6379` |
| `JWT_SECRET` | JWT 签名密钥 | 随机长字符串 |
| `PORT` | 监听端口 | `3000` |
| `NODE_ENV` | 运行环境 | `development` |

---

## 开发进度

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 0 | monorepo 初始化、共享包 | ✅ 完成 |
| Phase 1 | 后端 MVP（全部 P0 接口）| ✅ 完成 |
| Phase 2 | 移动端 MVP（4 个主页面）| ✅ 完成 |
| Phase 3 | 真机测试、Token 刷新联调 | 🔄 进行中 |
| Phase 4 | 统计页、目标、通知、分类管理 | ⏳ 计划中 |
| Phase 5 | Web 端、Supabase 方案、数据导出 | ⏳ 计划中 |

---

## 文档

| 文档 | 路径 |
|------|------|
| 产品需求文档（PRD）| [docs/01-prd.md](docs/01-prd.md) |
| 数据模型设计 | [docs/02-data-model.md](docs/02-data-model.md) |
| API 接口设计 | [docs/03-api-design.md](docs/03-api-design.md) |
| 页面交互设计 | [docs/04-page-design.md](docs/04-page-design.md) |
| 技术架构决策 | [docs/05-tech-architecture.md](docs/05-tech-architecture.md) |
| 开发计划与进度 | [docs/06-dev-plan.md](docs/06-dev-plan.md) |

---

## 生产部署（规划）

| 服务 | 平台 |
|------|------|
| API 服务 | Railway / Fly.io |
| 数据库 | Railway / Supabase |
| 缓存 | Upstash Redis |
| 文件存储 | Cloudflare R2 |
| 移动端构建 | Expo EAS |
