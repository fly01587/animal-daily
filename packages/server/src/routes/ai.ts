import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware, type AuthEnv } from '../middleware/auth.js'
import { AppError } from '../middleware/error.js'
import {
  extractAttachmentText,
  loadAttachmentsForUser,
  MAX_ATTACHMENTS_PER_MESSAGE,
  storeAttachment,
} from '../lib/ai-attachments.js'
import { db } from '../lib/db.js'
import { getLevelMeta, LEVEL } from '@animal-daily/shared'
import { randomUUID } from 'node:crypto'

const ai = new Hono<AuthEnv>()

const chatStreamSchema = z.object({
  message: z.string().trim().max(2000, '输入内容过长').optional().default(''),
  attachmentIds: z.array(z.string().uuid()).max(MAX_ATTACHMENTS_PER_MESSAGE).optional().default([]),
}).superRefine((value, ctx) => {
  if (!value.message && value.attachmentIds.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '请输入问题或上传至少一个附件',
      path: ['message'],
    })
  }
})

type UploadLikeFile = {
  name: string
  type: string
  arrayBuffer: () => Promise<ArrayBuffer>
}

const uploadSchema = z.object({
  file: z.custom<UploadLikeFile>(
    (value) =>
      !!value &&
      typeof value === 'object' &&
      'name' in value &&
      'arrayBuffer' in value &&
      typeof (value as { arrayBuffer?: unknown }).arrayBuffer === 'function',
    { message: '请上传有效附件' }
  ),
})

const toolGetActivitiesByDateSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  })
  .strict()

const toolGetDailySummaryByDateSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .strict()

const toolGetRecentActivitiesSchema = z
  .object({
    days: z.coerce.number().int().min(1).max(30).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict()

type OpenAIChatMessageParam = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content:
    | string
    | Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }
      >
  tool_calls?: OpenAIToolCall[]
  tool_call_id?: string
}

type OpenAIToolCall = {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

type OpenAICompletionResponse = {
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{
            type?: string
            text?: string
          }>
        | null
      tool_calls?: OpenAIToolCall[]
    }
  }>
}

const CHAT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_user_profile',
      description: '获取当前登录用户的资料与偏好设置',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_activities_by_date',
      description: '按日期获取用户事项，用于复盘某一天',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: '日期，格式 YYYY-MM-DD' },
          limit: { type: 'integer', minimum: 1, maximum: 50, description: '最多返回条数，默认 20' },
        },
        required: ['date'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_daily_summary_by_date',
      description: '按日期获取日总结（自动等级、手动等级、总时长等）',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: '日期，格式 YYYY-MM-DD' },
        },
        required: ['date'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_recent_activities',
      description: '获取最近 N 天事项，用于趋势分析与行动建议',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'integer', minimum: 1, maximum: 30, description: '最近几天，默认 7' },
          limit: { type: 'integer', minimum: 1, maximum: 100, description: '最多返回条数，默认 50' },
        },
        additionalProperties: false,
      },
    },
  },
] as const

function parseToolArgs(rawArgs: string): unknown {
  try {
    return JSON.parse(rawArgs || '{}')
  } catch {
    return {}
  }
}

function extractAssistantText(
  content:
    | string
    | Array<{
        type?: string
        text?: string
      }>
    | null
    | undefined
): string {
  if (!content) return ''
  if (typeof content === 'string') return content.trim()
  const parts = content
    .filter((item) => item?.type === 'text' && typeof item.text === 'string')
    .map((item) => item.text?.trim() || '')
    .filter(Boolean)
  return parts.join('\n').trim()
}

function chunkText(value: string, chunkSize = 120): string[] {
  if (!value) return ['']
  const chunks: string[] = []
  for (let i = 0; i < value.length; i += chunkSize) {
    chunks.push(value.slice(i, i + chunkSize))
  }
  return chunks
}

function buildOpenAiLikeSse(text: string, model: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const created = Math.floor(Date.now() / 1000)
  const id = `chatcmpl-${randomUUID()}`
  const chunks = chunkText(text)

  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        const payload = {
          id,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [
            {
              index: 0,
              delta: { content: chunk },
              finish_reason: null,
            },
          ],
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }

      const endPayload = {
        id,
        object: 'chat.completion.chunk',
        created,
        model,
        choices: [
          {
            index: 0,
            delta: {},
            finish_reason: 'stop',
          },
        ],
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(endPayload)}\n\n`))
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
}

async function getUpstreamErrorDetail(upstream: Response): Promise<string | null> {
  return upstream
    .json()
    .catch(() => null)
    .then((data: unknown) => {
      if (!data || typeof data !== 'object') return null
      const error = (data as { error?: { message?: unknown } }).error
      return typeof error?.message === 'string' ? error.message : null
    })
}

async function runTool(name: string, rawArgs: string, userId: string): Promise<unknown> {
  if (name === 'get_user_profile') {
    const profile = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        timezone: true,
        dailyReminderTime: true,
        reminderEnabled: true,
        createdAt: true,
      },
    })
    if (!profile) return { ok: false, error: '用户不存在' }
    return { ok: true, data: profile }
  }

  if (name === 'get_activities_by_date') {
    const parsed = toolGetActivitiesByDateSchema.safeParse(parseToolArgs(rawArgs))
    if (!parsed.success) return { ok: false, error: '参数格式错误', details: parsed.error.issues }

    const { date, limit = 20 } = parsed.data
    const activities = await db.activity.findMany({
      where: { userId, date: new Date(date) },
      include: { category: { select: { name: true, icon: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return {
      ok: true,
      data: activities.map((a) => ({
        id: a.id,
        content: a.content,
        level: a.level,
        levelName: getLevelMeta(a.level).name,
        categoryName: a.category?.name ?? null,
        categoryIcon: a.category?.icon ?? null,
        durationMinutes: a.durationMinutes,
        date: a.date.toISOString().slice(0, 10),
        createdAt: a.createdAt.toISOString(),
      })),
    }
  }

  if (name === 'get_daily_summary_by_date') {
    const parsed = toolGetDailySummaryByDateSchema.safeParse(parseToolArgs(rawArgs))
    if (!parsed.success) return { ok: false, error: '参数格式错误', details: parsed.error.issues }

    const targetDate = new Date(parsed.data.date)
    const summary = await db.dailySummary.findUnique({
      where: { userId_date: { userId, date: targetDate } },
    })
    const activities = await db.activity.findMany({
      where: { userId, date: targetDate },
      select: { level: true },
    })

    const levelDistribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    for (const item of activities) {
      levelDistribution[item.level] = (levelDistribution[item.level] ?? 0) + 1
    }

    if (!summary) {
      return {
        ok: true,
        data: {
          exists: false,
          date: parsed.data.date,
          autoLevel: LEVEL.DONE,
          manualLevel: null,
          effectiveLevel: LEVEL.DONE,
          effectiveLevelName: getLevelMeta(LEVEL.DONE).name,
          totalActivities: 0,
          totalMinutes: 0,
          note: null,
          levelDistribution,
        },
      }
    }

    const effectiveLevel = summary.manualLevel ?? summary.autoLevel
    return {
      ok: true,
      data: {
        exists: true,
        date: parsed.data.date,
        autoLevel: summary.autoLevel,
        manualLevel: summary.manualLevel,
        effectiveLevel,
        effectiveLevelName: getLevelMeta(effectiveLevel).name,
        totalActivities: summary.totalActivities,
        totalMinutes: summary.totalMinutes,
        note: summary.note,
        levelDistribution,
      },
    }
  }

  if (name === 'get_recent_activities') {
    const parsed = toolGetRecentActivitiesSchema.safeParse(parseToolArgs(rawArgs))
    if (!parsed.success) return { ok: false, error: '参数格式错误', details: parsed.error.issues }

    const days = parsed.data.days ?? 7
    const limit = parsed.data.limit ?? 50

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - (days - 1))
    startDate.setHours(0, 0, 0, 0)

    const activities = await db.activity.findMany({
      where: { userId, date: { gte: startDate } },
      include: { category: { select: { name: true, icon: true } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    })

    return {
      ok: true,
      data: {
        days,
        total: activities.length,
        items: activities.map((a) => ({
          id: a.id,
          date: a.date.toISOString().slice(0, 10),
          content: a.content,
          level: a.level,
          levelName: getLevelMeta(a.level).name,
          categoryName: a.category?.name ?? null,
          durationMinutes: a.durationMinutes,
          createdAt: a.createdAt.toISOString(),
        })),
      },
    }
  }

  return { ok: false, error: `未知工具: ${name}` }
}

async function runChatCompletionWithTools(input: {
  chatUrl: string
  apiKey: string
  model: string
  userContent: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  >
  userId: string
  signal: AbortSignal
}): Promise<string> {
  const messages: OpenAIChatMessageParam[] = [
    {
      role: 'system',
      content:
        '你是 Animal Daily 的效率助手。回答要简洁、可执行、贴合用户已记录事项，不编造用户未提供的数据。必要时优先调用工具获取真实数据后再回答。',
    },
    {
      role: 'user',
      content: input.userContent,
    },
  ]

  let finalText = ''

  for (let round = 0; round < 6; round++) {
    const upstream = await fetch(input.chatUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: input.model,
        stream: false,
        temperature: 0.2,
        messages,
        tools: CHAT_TOOLS,
        tool_choice: 'auto',
      }),
      signal: input.signal,
    })

    if (!upstream.ok) {
      const detail = await getUpstreamErrorDetail(upstream)
      throw new AppError(50012, detail ?? 'AI 上游服务异常', 502)
    }

    const completion = (await upstream.json().catch(() => null)) as OpenAICompletionResponse | null
    const assistantMessage = completion?.choices?.[0]?.message
    if (!assistantMessage) {
      throw new AppError(50012, 'AI 上游响应格式异常', 502)
    }

    const toolCalls = assistantMessage.tool_calls ?? []
    if (toolCalls.length === 0) {
      finalText = extractAssistantText(assistantMessage.content)
      break
    }

    messages.push({
      role: 'assistant',
      content: extractAssistantText(assistantMessage.content),
      tool_calls: toolCalls,
    })

    for (const toolCall of toolCalls) {
      const toolOutput = await runTool(toolCall.function.name, toolCall.function.arguments, input.userId)
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolOutput),
      })
    }
  }

  return finalText.trim() || '我已查询到部分信息，但暂时无法生成完整回答。请再试一次。'
}

ai.use('*', authMiddleware)

ai.post('/upload', async (c) => {
  const form = await c.req.formData().catch(() => null)
  if (!form) throw new AppError(40101, '请使用 multipart/form-data 上传附件', 400)

  const parsed = uploadSchema.parse({ file: form.get('file') })
  const file = parsed.file
  const bytes = new Uint8Array(await file.arrayBuffer())
  const userId = c.get('userId')

  const uploaded = await storeAttachment({
    userId,
    fileName: file.name,
    mimeType: file.type,
    bytes,
  })

  return c.json({
    code: 0,
    data: uploaded,
    message: 'ok',
  })
})

/** 流式 AI 对话（最小可用版） */
ai.post('/chat-stream', async (c) => {
  const { message, attachmentIds } = chatStreamSchema.parse(await c.req.json())
  const apiKey = process.env.OPENAI_API_KEY
  const model = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini'
  const baseUrlRaw = process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1'
  const baseUrl = baseUrlRaw.replace(/\/+$/, '')
  const chatPathRaw = process.env.OPENAI_CHAT_COMPLETIONS_PATH?.trim() || '/chat/completions'
  const chatPath = chatPathRaw.startsWith('/') ? chatPathRaw : `/${chatPathRaw}`
  const chatUrl = `${baseUrl}${chatPath}`
  const userId = c.get('userId')

  if (!apiKey) {
    throw new AppError(50011, 'AI 服务未配置，请设置 OPENAI_API_KEY', 503)
  }

  const attachments =
    attachmentIds.length > 0 ? await loadAttachmentsForUser(userId, attachmentIds) : []

  const userTextChunks: string[] = []
  if (message) userTextChunks.push(message)

  const userContent: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  > = []

  for (const attachment of attachments) {
    if (attachment.kind === 'image') {
      const base64 = Buffer.from(attachment.bytes).toString('base64')
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:${attachment.mimeType};base64,${base64}` },
      })
      continue
    }

    const extractedText = extractAttachmentText(attachment)
    if (!extractedText) {
      userTextChunks.push(
        `附件《${attachment.name}》未提取到可读文本（可能是扫描件或受保护文档）。`
      )
      continue
    }

    const cappedText = extractedText.slice(0, 12000)
    userTextChunks.push(`附件《${attachment.name}》内容：\n${cappedText}`)
  }

  if (userTextChunks.length === 0) {
    userTextChunks.push('请分析我上传的附件，并给出简洁、可执行的建议。')
  }
  userContent.unshift({ type: 'text', text: userTextChunks.join('\n\n') })

  const finalText = await runChatCompletionWithTools({
    chatUrl,
    apiKey,
    model,
    userContent,
    userId,
    signal: c.req.raw.signal,
  })

  const stream = buildOpenAiLikeSse(finalText, model)
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
})


export { ai }
