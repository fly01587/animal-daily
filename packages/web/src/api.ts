import type {
  Activity,
  Category,
  User,
  AuthResponse,
  CalendarDay,
  DailySummary,
  LevelValue,
} from '@animal-daily/shared'

const API_BASE = '/api/v1'

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

export interface DailySummaryWithDistribution extends DailySummary {
  levelDistribution: Record<number, number>
  bestStreak?: number
}

export interface MonthlyStats {
  year: number
  month: number
  avgLevel: LevelValue
  levelDistribution: Record<number, number>
  bestStreak: number
  totalActivities: number
  totalMinutes: number
  activeDays: number
}

export type MarketMonitorTrend = 'up' | 'down' | 'flat' | 'na'

export interface MarketMonitorPoint {
  date: string
  value: number
}

export interface MarketMonitorMetric {
  id: 'realYield10Y' | 'usdBroad' | 'highYieldSpread' | 'gldHoldingsTonnes'
  name: string
  unit: string
  source: string
  sourceUrl: string
  latestValue: number | null
  latestDate: string | null
  previousValue: number | null
  previousDate: string | null
  change: number | null
  changePct: number | null
  trend: MarketMonitorTrend
  goldImpact: string
  history: MarketMonitorPoint[]
}

export interface MarketMonitorPayload {
  generatedAt: string
  periodDays: number
  metrics: MarketMonitorMetric[]
  warnings: string[]
}

function getToken() {
  return localStorage.getItem('access_token')
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('access_token', accessToken)
  localStorage.setItem('refresh_token', refreshToken)
}

export function clearTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

interface ChatStreamOptions {
  signal?: AbortSignal
  onToken: (token: string) => void
}

export interface AiUploadedAttachment {
  id: string
  name: string
  mimeType: string
  kind: 'image' | 'text' | 'pdf'
  size: number
  createdAt: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })

  const json = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(json?.message ?? '请求失败', res.status)
  }

  return (json?.data ?? json) as T
}

export const api = {
  login(email: string, password: string) {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },
  register(email: string, password: string, nickname: string) {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, nickname }),
    })
  },
  profile() {
    return request<User>('/user/profile')
  },
  updateProfile(data: { nickname?: string; avatarUrl?: string }) {
    return request<User>('/user/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },
  categories() {
    return request<Category[]>('/categories')
  },
  activities(date: string) {
    return request<Activity[]>(`/activities?date=${date}`)
  },
  calendar(year: number, month: number) {
    return request<CalendarDay[]>(`/daily-summary/calendar?year=${year}&month=${month}`)
  },
  dailySummary(date: string) {
    return request<DailySummaryWithDistribution>(`/daily-summary?date=${encodeURIComponent(date)}`)
  },
  monthlyStats(year: number, month: number) {
    return request<MonthlyStats>(`/daily-summary/stats?year=${year}&month=${month}`)
  },
  marketMonitor(days = 90) {
    return request<MarketMonitorPayload>(`/market-monitor?days=${days}`)
  },
  addActivity(input: {
    date: string
    categoryId?: string | null
    content: string
    level: LevelValue
    durationMinutes?: number
  }) {
    return request<Activity>('/activities', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },
  async uploadAiAttachment(file: File): Promise<AiUploadedAttachment> {
    const token = getToken()
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch(`${API_BASE}/ai/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    })

    const json = await res.json().catch(() => null)
    if (!res.ok) {
      throw new ApiError(json?.message ?? '附件上传失败', res.status)
    }

    return (json?.data ?? json) as AiUploadedAttachment
  },
  async chatStream(
    message: string,
    attachmentIds: string[],
    options: ChatStreamOptions
  ): Promise<string> {
    const token = getToken()
    const res = await fetch(`${API_BASE}/ai/chat-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, attachmentIds }),
      signal: options.signal,
    })

    if (!res.ok) {
      const json = await res.json().catch(() => null)
      throw new ApiError(json?.message ?? 'AI 请求失败', res.status)
    }

    if (!res.body) {
      throw new ApiError('AI 服务未返回流数据', 500)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      let newlineIndex = buffer.indexOf('\n')
      while (newlineIndex >= 0) {
        const line = buffer.slice(0, newlineIndex).trim()
        buffer = buffer.slice(newlineIndex + 1)

        if (line.startsWith('data:')) {
          const payload = line.slice(5).trim()

          if (payload === '[DONE]') {
            return fullText
          }

          try {
            const json = JSON.parse(payload)
            const delta = json?.choices?.[0]?.delta?.content
            if (typeof delta === 'string' && delta.length > 0) {
              fullText += delta
              options.onToken(delta)
            }
          } catch {
            // ignore non-JSON SSE lines
          }
        }

        newlineIndex = buffer.indexOf('\n')
      }
    }

    return fullText
  },
}
