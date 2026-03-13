# Animal Daily — API 接口设计

> 版本: 1.0
> 创建日期: 2026-03-12
> 状态: 草稿

---

## 1. 通用约定

### 1.1 基础信息

- Base URL: `/api/v1`
- 协议: HTTPS
- 数据格式: JSON
- 认证方式: Bearer Token (JWT)
- 时区: 请求头 `X-Timezone` 或用户设置

### 1.2 通用响应格式

成功响应:
```json
{
  "code": 0,
  "data": { ... },
  "message": "ok"
}
```

分页响应:
```json
{
  "code": 0,
  "data": {
    "items": [ ... ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  },
  "message": "ok"
}
```

错误响应:
```json
{
  "code": 40001,
  "data": null,
  "message": "邮箱已被注册"
}
```

### 1.3 错误码规范

| 范围 | 含义 |
|------|------|
| 0 | 成功 |
| 40001-40099 | 认证/权限错误 |
| 40101-40199 | 参数校验错误 |
| 40401-40499 | 资源不存在 |
| 50001-50099 | 服务器内部错误 |

### 1.4 认证

除登录/注册外，所有接口需要在请求头携带:
```
Authorization: Bearer <access_token>
```

---

## 2. 认证模块

### 2.1 注册

```
POST /auth/register
```

请求体:
```json
{
  "email": "user@example.com",
  "password": "min8chars",
  "nickname": "小明"
}
```

响应:
```json
{
  "code": 0,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "nickname": "小明"
    },
    "accessToken": "jwt...",
    "refreshToken": "rt..."
  }
}
```

校验规则:
- email: 合法邮箱格式，唯一
- password: 最少 8 位，包含字母和数字
- nickname: 1-50 字符

### 2.2 登录

```
POST /auth/login
```

请求体:
```json
{
  "email": "user@example.com",
  "password": "min8chars",
  "deviceInfo": "iPhone 15 Pro / Android"
}
```

响应: 同注册

### 2.3 刷新 Token

```
POST /auth/refresh
```

请求体:
```json
{
  "refreshToken": "rt..."
}
```

响应:
```json
{
  "code": 0,
  "data": {
    "accessToken": "new_jwt...",
    "refreshToken": "new_rt..."
  }
}
```

### 2.4 登出

```
POST /auth/logout
```

请求体:
```json
{
  "refreshToken": "rt..."
}
```

响应:
```json
{
  "code": 0,
  "data": null,
  "message": "ok"
}
```

---

## 3. 用户模块

### 3.1 获取当前用户信息

```
GET /user/profile
```

响应:
```json
{
  "code": 0,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "nickname": "小明",
    "avatarUrl": null,
    "timezone": "Asia/Shanghai",
    "dailyReminderTime": "21:00",
    "reminderEnabled": true,
    "createdAt": "2026-03-12T10:00:00Z"
  }
}
```

### 3.2 更新用户信息

```
PATCH /user/profile
```

请求体（部分更新）:
```json
{
  "nickname": "新昵称",
  "timezone": "Asia/Tokyo",
  "dailyReminderTime": "22:00",
  "reminderEnabled": false
}
```

### 3.3 修改密码

```
POST /user/change-password
```

请求体:
```json
{
  "oldPassword": "current",
  "newPassword": "newpass123"
}
```

### 3.4 上传头像

```
POST /user/avatar
Content-Type: multipart/form-data
```

字段: `file` (image/jpeg, image/png, max 2MB)

响应:
```json
{
  "code": 0,
  "data": {
    "avatarUrl": "https://cdn.example.com/avatars/uuid.jpg"
  }
}
```

---

## 4. 分类模块

### 4.1 获取分类列表

```
GET /categories
```

响应:
```json
{
  "code": 0,
  "data": [
    {
      "id": "uuid",
      "name": "工作",
      "icon": "💼",
      "color": "#3B82F6",
      "isPreset": true,
      "sortOrder": 0
    }
  ]
}
```

### 4.2 创建分类

```
POST /categories
```

请求体:
```json
{
  "name": "副业",
  "icon": "💰",
  "color": "#F59E0B"
}
```

### 4.3 更新分类

```
PATCH /categories/:id
```

请求体:
```json
{
  "name": "新名称",
  "icon": "🎯",
  "color": "#EF4444"
}
```

### 4.4 删除分类

```
DELETE /categories/:id
```

说明: 删除分类后，该分类下的事项 category_id 置为 null

### 4.5 排序分类

```
PUT /categories/sort
```

请求体:
```json
{
  "ids": ["uuid1", "uuid2", "uuid3"]
}
```

---

## 5. 事项模块（核心）

### 5.1 获取某日事项列表

```
GET /activities?date=2026-03-12
```

查询参数:
- `date` (必填): 日期，格式 YYYY-MM-DD
- `categoryId` (可选): 按分类筛选
- `level` (可选): 按等级筛选 1-5

响应:
```json
{
  "code": 0,
  "data": [
    {
      "id": "uuid",
      "content": "完成 API 设计文档",
      "level": 4,
      "levelName": "顶级",
      "categoryId": "uuid",
      "categoryName": "工作",
      "categoryIcon": "💼",
      "durationMinutes": 120,
      "date": "2026-03-12",
      "createdAt": "2026-03-12T14:30:00Z"
    }
  ]
}
```

### 5.2 创建事项

```
POST /activities
```

请求体:
```json
{
  "content": "完成 API 设计文档",
  "level": 4,
  "categoryId": "uuid",
  "durationMinutes": 120,
  "date": "2026-03-12"
}
```

校验规则:
- content: 1-500 字符，必填
- level: 1-5 整数，必填
- categoryId: 可选，需属于当前用户
- durationMinutes: 可选，正整数
- date: 必填，不能超过今天（允许补录过去7天）

### 5.3 更新事项

```
PATCH /activities/:id
```

请求体（部分更新）:
```json
{
  "content": "修改后的内容",
  "level": 5,
  "categoryId": "new-uuid",
  "durationMinutes": 180
}
```

### 5.4 删除事项

```
DELETE /activities/:id
```

### 5.5 批量操作（P1）

```
POST /activities/batch
```

请求体:
```json
{
  "action": "delete",
  "ids": ["uuid1", "uuid2"]
}
```

支持 action: `delete`, `updateLevel`, `updateCategory`

---

## 6. 每日总结模块

### 6.1 获取某日总结

```
GET /daily-summary?date=2026-03-12
```

响应:
```json
{
  "code": 0,
  "data": {
    "id": "uuid",
    "date": "2026-03-12",
    "autoLevel": 4,
    "manualLevel": null,
    "effectiveLevel": 4,
    "effectiveLevelName": "顶级",
    "totalActivities": 6,
    "totalMinutes": 480,
    "note": "今天效率不错",
    "aiSummary": null,
    "levelDistribution": {
      "5": 1,
      "4": 3,
      "3": 2,
      "2": 0,
      "1": 0
    }
  }
}
```

### 6.2 手动覆盖每日等级

```
PATCH /daily-summary
```

请求体:
```json
{
  "date": "2026-03-12",
  "manualLevel": 5,
  "note": "虽然自动算是顶级，但我觉得今天是夯"
}
```

### 6.3 获取日历视图数据

```
GET /daily-summary/calendar?year=2026&month=3
```

响应:
```json
{
  "code": 0,
  "data": [
    { "date": "2026-03-01", "level": 3, "levelName": "人上人", "count": 5 },
    { "date": "2026-03-02", "level": 1, "levelName": "拉完了", "count": 0 },
    { "date": "2026-03-03", "level": 4, "levelName": "顶级", "count": 8 }
  ]
}
```

说明: 无记录的日期 level 为 1（拉完了），count 为 0

---

## 7. 统计模块（P1）

### 7.1 等级分布统计

```
GET /stats/level-distribution?startDate=2026-03-01&endDate=2026-03-31
```

响应:
```json
{
  "code": 0,
  "data": {
    "distribution": [
      { "level": 5, "name": "夯", "days": 3, "percentage": 10 },
      { "level": 4, "name": "顶级", "days": 8, "percentage": 26 },
      { "level": 3, "name": "人上人", "days": 12, "percentage": 39 },
      { "level": 2, "name": "NPC", "days": 5, "percentage": 16 },
      { "level": 1, "name": "拉完了", "days": 3, "percentage": 10 }
    ],
    "totalDays": 31,
    "averageLevel": 3.2
  }
}
```

### 7.2 趋势统计

```
GET /stats/trend?startDate=2026-03-01&endDate=2026-03-31&granularity=daily
```

查询参数:
- granularity: `daily` / `weekly` / `monthly`

响应:
```json
{
  "code": 0,
  "data": {
    "points": [
      { "date": "2026-03-01", "level": 3, "activityCount": 5, "totalMinutes": 360 },
      { "date": "2026-03-02", "level": 4, "activityCount": 7, "totalMinutes": 480 }
    ]
  }
}
```

### 7.3 分类时间占比

```
GET /stats/category-time?startDate=2026-03-01&endDate=2026-03-31
```

响应:
```json
{
  "code": 0,
  "data": [
    { "categoryId": "uuid", "name": "工作", "icon": "💼", "totalMinutes": 4800, "percentage": 55 },
    { "categoryId": "uuid", "name": "学习", "icon": "📚", "totalMinutes": 1200, "percentage": 14 }
  ]
}
```

### 7.4 连续记录统计

```
GET /stats/streaks
```

响应:
```json
{
  "code": 0,
  "data": {
    "currentStreak": 7,
    "longestStreak": 23,
    "currentLevelStreak": {
      "level": 3,
      "levelName": "人上人",
      "days": 3
    },
    "bestLevelStreak": {
      "level": 5,
      "levelName": "夯",
      "days": 5
    }
  }
}
```

---

## 8. 目标模块（P1）

### 8.1 获取目标列表

```
GET /goals?active=true
```

### 8.2 创建目标

```
POST /goals
```

请求体:
```json
{
  "title": "本周至少3天人上人以上",
  "targetLevel": 3,
  "targetDays": 3,
  "period": "weekly",
  "startDate": "2026-03-10",
  "endDate": null
}
```

### 8.3 获取目标进度

```
GET /goals/:id/progress
```

响应:
```json
{
  "code": 0,
  "data": {
    "goal": { ... },
    "currentPeriod": {
      "start": "2026-03-10",
      "end": "2026-03-16",
      "achievedDays": 2,
      "targetDays": 3,
      "progress": 66.7,
      "completed": false
    }
  }
}
```

### 8.4 更新目标

```
PATCH /goals/:id
```

### 8.5 删除目标

```
DELETE /goals/:id
```

---

## 9. Token 策略

| 项目 | 值 |
|------|------|
| Access Token 有效期 | 15 分钟 |
| Refresh Token 有效期 | 30 天 |
| Access Token 算法 | HS256 |
| Refresh Token 存储 | 数据库（哈希存储） |
| 并发设备数 | 不限（每设备独立 refresh token） |

### Token Payload (Access Token)

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "iat": 1710230400,
  "exp": 1710231300
}
```
