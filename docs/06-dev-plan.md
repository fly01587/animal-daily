# Animal Daily — 开发计划与里程碑

> 版本: 1.0
> 创建日期: 2026-03-12
> 最后更新: 2026-03-13

---

## 1. 阶段总览

| 阶段 | 名称 | 周期 | 目标 |
|------|------|------|------|
| Phase 0 | 项目初始化 | 1 天 | Monorepo 搭建、基础配置 |
| Phase 1 | 后端 MVP | 3-4 天 | 认证 + 事项 CRUD + 每日总结 API |
| Phase 2 | 移动端 MVP | 5-7 天 | 4 个核心页面 + 基础交互 |
| Phase 3 | 联调打通 | 2-3 天 | 前后端联调、真机测试 |
| Phase 4 | P1 功能 | 5-7 天 | 统计、目标、分类管理 |
| Phase 5 | 方案 C | 待定 | Supabase 重构版本 |

---

## 2. Phase 0 — 项目初始化（1 天）

### 任务清单

- [x] 初始化 pnpm monorepo
- [x] 创建 packages/shared 共享包
  - [x] 类型定义 (types.ts)
  - [x] 等级常量 (constants.ts)
  - [x] Zod 校验 (validators.ts)
- [x] 创建 packages/server 后端骨架
  - [x] Hono 基础配置
  - [x] Prisma 初始化 + schema
  - [x] 环境变量配置
- [x] 创建 packages/mobile Expo 项目
  - [x] Expo Router 配置
  - [x] 基础导航结构
- [x] Git 初始化 + .gitignore
### 完成标准
- `pnpm install` 无报错
- `pnpm --filter server dev` 启动成功
- `pnpm --filter mobile start` 启动成功
- shared 包可被 server 和 mobile 正确引用

---

## 3. Phase 1 — 后端 MVP（3-4 天）

### Day 1: 认证系统

- [x] 数据库迁移（users + refresh_tokens 表）
- [x] POST /auth/register
- [x] POST /auth/login
- [x] POST /auth/refresh
- [x] POST /auth/logout
- [x] JWT 中间件
- [x] 全局错误处理中间件
- [x] 认证接口测试

### Day 2: 事项 CRUD

- [x] 数据库迁移（categories + activities 表）
- [x] 注册时自动创建预设分类（种子逻辑）
- [x] GET /categories
- [x] GET /activities?date=
- [x] POST /activities
- [x] PATCH /activities/:id
- [x] DELETE /activities/:id
- [x] 事项接口测试

### Day 3: 每日总结

- [x] 数据库迁移（daily_summaries 表）
- [x] 自动计算每日等级逻辑（加权平均）
- [x] GET /daily-summary?date=
- [x] PATCH /daily-summary（手动覆盖）
- [x] GET /daily-summary/calendar?year=&month=
- [x] 总结接口测试

### Day 4: 补充 + 联调准备

- [x] GET /user/profile
- [x] PATCH /user/profile
- [x] POST /user/change-password
- [ ] 频率限制中间件
- [ ] 请求日志
- [ ] 全接口 Postman/Hoppscotch 集合导出
- [x] Docker Compose（PostgreSQL + Redis）

### 完成标准
- 所有 P0 接口可通过 HTTP 客户端正常调用
- 认证流程完整（注册→登录→刷新→登出）
- 事项 CRUD 正常，每日等级自动计算正确
- 测试覆盖核心业务逻辑

---

## 4. Phase 2 — 移动端 MVP（5-7 天）

### Day 1-2: 基础框架 + 认证

- [x] API 客户端封装（typed fetch with token refresh）
- [x] Token 存储（MMKV）+ 自动刷新拦截器
- [x] Auth Store (Zustand)
- [x] 登录页 UI + 逻辑
- [x] 注册页 UI + 逻辑
- [x] 认证路由守卫（未登录跳转）

### Day 3-4: 首页（今日）

- [x] 等级卡片组件 (LevelCard)
- [x] 等级选择器组件 (LevelPicker)
- [x] 事项卡片组件 (ActivityCard)
- [x] 时间轴列表（FlatList 按时间倒序）
- [x] 添加事项 BottomSheet (ActivityFormSheet)
- [x] 编辑事项 BottomSheet
- [ ] 左滑删除（未实现，当前用 onDelete 按钮）
- [x] 下拉刷新

### Day 5: 日历页

- [x] 月历组件（自定义 getCalendarDays）
- [x] 等级色块渲染
- [x] 月份切换（按钮）
- [x] 点击日期 → 底部摘要卡片
- [x] 跳转某日详情

### Day 6: 某日详情 + 我的页

- [x] 某日详情页（复用 LevelCard + ActivityCard + ActivityFormSheet）
- [x] 我的页 UI（头像、菜单项、badge）
- [ ] 编辑资料（UI 未实现）
- [x] 退出登录

### Day 7: 打磨

- [x] 启动页 (Splash + token restore)
- [x] 骨架屏加载状态 (HomeSkeleton, CalendarSkeleton)
- [x] Toast 提示（成功/错误/信息）
- [ ] 基础动画（页面切换、弹窗）— 使用 Modal slide
- [x] 错误处理 UI（Toast error）
- [x] Bug fix: ActivityFormSheet 重复日期显示

### 完成标准
- 4 个 Tab 页面可正常切换
- 事项增删改查流程完整
- 日历页正确显示等级色块
- 登录/注册/登出流程正常

---

## 5. Phase 3 — 联调打通（2-3 天）

- [ ] 移动端对接真实后端 API
- [ ] 处理网络异常 / 超时
- [ ] Token 过期自动刷新验证
- [ ] 真机测试（iOS + Android）
- [ ] 性能优化（列表渲染、请求缓存）
- [ ] Bug 修复

### 完成标准
- 真机上完整跑通核心流程
- 无明显卡顿或崩溃
- 网络异常有友好提示

---

## 6. Phase 4 — P1 功能（5-7 天）

### 后端

- [ ] 统计接口（等级分布、趋势、分类占比）
- [ ] 目标 CRUD 接口
- [ ] 分类 CRUD + 排序接口
- [ ] 批量操作接口

### 移动端

- [ ] 统计页（折线图、柱状图、饼图）
- [ ] 分类管理页（增删改排序）
- [ ] 目标设定页
- [ ] 每日提醒通知（Expo Notifications）
- [ ] 数据导出（Markdown/CSV）

### 完成标准
- 统计图表数据准确
- 分类管理流程完整
- 提醒通知正常触发

---

## 7. Phase 5 — 方案 C: Supabase 版本（待定）

### 目标
用 Supabase BaaS 重新实现后端，对比两种方案的开发体验和维护成本。

### 任务
- [ ] Supabase 项目创建 + 数据库迁移
- [ ] Row Level Security (RLS) 策略配置
- [ ] Supabase Auth 替代自建认证
- [ ] Supabase Realtime 实时订阅
- [ ] 移动端切换到 Supabase SDK
- [ ] Web 端（Next.js）开发
- [ ] 方案 A vs C 对比文档

---

## 8. 当前进度追踪

| 文档 | 状态 | 文件 |
|------|------|------|
| 产品需求文档 (PRD) | ✅ 完成 | docs/01-prd.md |
| 数据模型设计 | ✅ 完成 | docs/02-data-model.md |
| API 接口设计 | ✅ 完成 | docs/03-api-design.md |
| 页面流程与布局 | ✅ 完成 | docs/04-page-design.md |
| 技术架构设计 | ✅ 完成 | docs/05-tech-architecture.md |
| 开发计划与里程碑 | ✅ 完成 | docs/06-dev-plan.md |

| 阶段 | 状态 | 完成日期 |
|------|------|----------|
| Phase 0 项目初始化 | ✅ 完成 | 2026-03-12 |
| Phase 1 后端 MVP | ✅ 完成 | 2026-03-12 |
| Phase 2 移动端 MVP | ✅ 完成 | 2026-03-13 |
| Phase 3 联调打通 | ⏳ 待开始 | - |
| Phase 4 P1 功能 | ⏳ 待开始 | - |
| Phase 5 方案 C | ⏳ 待开始 | - |

### 下一步
- Phase 3: 前后端联调、真机测试、网络异常处理
- Phase 4: 统计图表、分类管理、目标设定
