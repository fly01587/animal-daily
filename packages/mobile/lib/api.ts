import type { ApiResponse, AuthResponse } from '@animal-daily/shared'
import { tokenStorage } from './storage'

const API_BASE = __DEV__
  ? 'http://10.0.2.2:3000/api/v1' // Android emulator → host machine
  : 'https://api.animaldaily.app/api/v1'

// iOS simulator uses localhost directly
// import { Platform } from 'react-native'
// if (Platform.OS === 'ios') API_BASE = 'http://localhost:3000/api/v1'

let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) return null

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!res.ok) {
      tokenStorage.clearTokens()
      return null
    }

    const json: ApiResponse<{ accessToken: string; refreshToken: string }> =
      await res.json()
    tokenStorage.setAccessToken(json.data.accessToken)
    tokenStorage.setRefreshToken(json.data.refreshToken)
    return json.data.accessToken
  } catch {
    tokenStorage.clearTokens()
    return null
  }
}

async function getValidToken(): Promise<string | null> {
  const token = tokenStorage.getAccessToken()
  if (token) return token

  // If already refreshing, wait for that to finish
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  isRefreshing = true
  refreshPromise = refreshAccessToken().finally(() => {
    isRefreshing = false
    refreshPromise = null
  })

  return refreshPromise
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  timeout?: number
  /** Skip auth header (for login/register) */
  noAuth?: boolean
}

class ApiError extends Error {
  constructor(
    public status: number,
    public code: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, headers = {}, timeout = 10000, noAuth } = options

  const url = `${API_BASE}${path}`
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  }

  if (!noAuth) {
    const token = await getValidToken()
    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(url, {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    // Token expired — try refresh once
    if (res.status === 401 && !noAuth) {
      const newToken = await refreshAccessToken()
      if (newToken) {
        reqHeaders['Authorization'] = `Bearer ${newToken}`
        const retryRes = await fetch(url, {
          method,
          headers: reqHeaders,
          body: body ? JSON.stringify(body) : undefined,
        })
        const retryJson: ApiResponse<T> = await retryRes.json()
        if (!retryRes.ok) {
          throw new ApiError(retryRes.status, retryJson.code, retryJson.message)
        }
        return retryJson.data
      }
      // Refresh failed — force logout
      throw new ApiError(401, -1, '登录已过期，请重新登录')
    }

    const json: ApiResponse<T> = await res.json()
    if (!res.ok) {
      throw new ApiError(res.status, json.code, json.message)
    }
    return json.data
  } finally {
    clearTimeout(timer)
  }
}

// ============================================================
// Typed API methods
// ============================================================

export const api = {
  // ---- Auth ----
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      noAuth: true,
    }),

  register: (email: string, password: string, nickname: string) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: { email, password, nickname },
      noAuth: true,
    }),

  refresh: (refreshToken: string) =>
    request<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      noAuth: true,
    }),

  logout: () =>
    request<null>('/auth/logout', {
      method: 'POST',
      body: { refreshToken: tokenStorage.getRefreshToken() },
    }),

  // ---- Activities ----
  getActivities: (date: string) =>
    request<import('@animal-daily/shared').Activity[]>(
      `/activities?date=${date}`,
    ),

  createActivity: (data: {
    content: string
    level: number
    categoryId?: string | null
    durationMinutes?: number | null
    date: string
  }) =>
    request<{ id: string }>('/activities', {
      method: 'POST',
      body: data,
    }),

  updateActivity: (
    id: string,
    data: Partial<{
      content: string
      level: number
      categoryId: string | null
      durationMinutes: number | null
    }>,
  ) =>
    request<null>(`/activities/${id}`, {
      method: 'PATCH',
      body: data,
    }),

  deleteActivity: (id: string) =>
    request<null>(`/activities/${id}`, { method: 'DELETE' }),

  // ---- Categories ----
  getCategories: () =>
    request<import('@animal-daily/shared').Category[]>('/categories'),

  // ---- Daily Summary ----
  getDailySummary: (date: string) =>
    request<import('@animal-daily/shared').DailySummary>(
      `/daily-summary?date=${date}`,
    ),

  updateDailySummary: (data: {
    date: string
    manualLevel?: number | null
    note?: string | null
  }) =>
    request<null>('/daily-summary', {
      method: 'PATCH',
      body: data,
    }),

  getCalendar: (year: number, month: number) =>
    request<import('@animal-daily/shared').CalendarDay[]>(
      `/daily-summary/calendar?year=${year}&month=${month}`,
    ),

  // ---- User ----
  getProfile: () => request<import('@animal-daily/shared').User>('/user/profile'),

  updateProfile: (data: Partial<{
    nickname: string
    timezone: string
    dailyReminderTime: string
    reminderEnabled: boolean
  }>) =>
    request<null>('/user/profile', {
      method: 'PATCH',
      body: data,
    }),

  changePassword: (oldPassword: string, newPassword: string) =>
    request<null>('/user/change-password', {
      method: 'POST',
      body: { oldPassword, newPassword },
    }),
}

export { ApiError }
export { API_BASE }
