import { create } from 'zustand'
import { tokenStorage } from '../lib/storage'
import { api, ApiError } from '../lib/api'
import type { User } from '@animal-daily/shared'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean

  /** Set user directly (from login/register response) */
  setUser: (user: User) => void

  /** Login with email & password */
  login: (email: string, password: string) => Promise<void>

  /** Register with email, password, nickname */
  register: (email: string, password: string, nickname: string) => Promise<void>

  /** Logout and clear tokens */
  logout: () => Promise<void>

  /** Try restoring session from stored tokens */
  restoreSession: () => Promise<boolean>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  setUser: (user) => set({ user, isAuthenticated: true }),

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const data = await api.login(email, password)
      tokenStorage.setAccessToken(data.accessToken)
      tokenStorage.setRefreshToken(data.refreshToken)
      set({ user: data.user, isAuthenticated: true })
    } finally {
      set({ isLoading: false })
    }
  },

  register: async (email, password, nickname) => {
    set({ isLoading: true })
    try {
      const data = await api.register(email, password, nickname)
      tokenStorage.setAccessToken(data.accessToken)
      tokenStorage.setRefreshToken(data.refreshToken)
      set({ user: data.user, isAuthenticated: true })
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    try {
      await api.logout()
    } catch {
      // Ignore logout API errors — clear local state regardless
    }
    tokenStorage.clearTokens()
    set({ user: null, isAuthenticated: false })
  },

  restoreSession: async () => {
    const token = tokenStorage.getAccessToken()
    if (!token) return false

    try {
      const user = await api.getProfile()
      set({ user, isAuthenticated: true })
      return true
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        tokenStorage.clearTokens()
      }
      return false
    }
  },
}))
