import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { ZodError } from 'zod'
import { logger } from '../lib/logger.js'

/** 全局错误处理 */
export function errorHandler(err: Error, c: Context) {
  // Zod 校验错误
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join('; ')
    return c.json({ code: 40101, data: null, message }, 400)
  }

  // 已知业务错误
  if (err instanceof AppError) {
    return c.json({ code: err.code, data: null, message: err.message }, err.status as ContentfulStatusCode)
  }

  // 未知错误
  logger.error(err, '未处理的服务器错误')
  return c.json({ code: 50001, data: null, message: '服务器内部错误' }, 500)
}

/** 业务错误类 */
export class AppError extends Error {
  constructor(
    public code: number,
    message: string,
    public status: number = 400
  ) {
    super(message)
    this.name = 'AppError'
  }
}
