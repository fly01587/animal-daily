import { MMKV } from 'react-native-mmkv'

export const storage = new MMKV({ id: 'animal-daily' })

/** 存取 token */
export const tokenStorage = {
  getAccessToken: () => storage.getString('access_token') ?? null,
  setAccessToken: (token: string) => storage.set('access_token', token),
  getRefreshToken: () => storage.getString('refresh_token') ?? null,
  setRefreshToken: (token: string) => storage.set('refresh_token', token),
  clearTokens: () => {
    storage.delete('access_token')
    storage.delete('refresh_token')
  },
}
