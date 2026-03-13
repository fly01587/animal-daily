import type { Context, Next } from 'hono'
import { verifyAccessToken } from '../lib/jwt.js'

export interface AuthEnv {
  Variables: {
    userId: string
    userEmail: string
  }
}

/** JWT 认证中间件 */
export async function authMiddleware(c: Context<AuthEnv>, next: Next) {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) {
    return c.json({ code: 40001, data: null, message: '未提供认证令牌' }, 401)
  }

  const token = header.slice(7)
  try {
    const payload = await verifyAccessToken(token)
    c.set('userId', payload.sub)
    c.set('userEmail', payload.email)
    await next()
  } catch {
    return c.json({ code: 40002, data: null, message: '令牌无效或已过期' }, 401)
  }
}
