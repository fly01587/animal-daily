import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { auth } from './routes/auth.js'
import { activity } from './routes/activity.js'
import { category } from './routes/category.js'
import { dailySummary } from './routes/daily-summary.js'
import { user } from './routes/user.js'
import { errorHandler } from './middleware/error.js'
import { logger } from './lib/logger.js'

const app = new Hono()

// 全局中间件
app.use('*', cors())
app.onError(errorHandler)

// 健康检查
app.get('/api/v1/ping', (c) => c.json({ code: 0, data: 'pong', message: 'ok' }))

// 路由挂载
app.route('/api/v1/auth', auth)
app.route('/api/v1/activities', activity)
app.route('/api/v1/categories', category)
app.route('/api/v1/daily-summary', dailySummary)
app.route('/api/v1/user', user)

// 启动服务
const port = Number(process.env.PORT) || 3000

serve({ fetch: app.fetch, port }, () => {
  logger.info(`🐾 Animal Daily API running on http://localhost:${port}`)
})

export default app
