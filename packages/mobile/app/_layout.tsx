import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import { useAuthStore } from '../stores/auth.store'
import { ToastProvider } from '../contexts/ToastContext'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60, // 1 分钟
    },
  },
})

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <Text style={styles.logo}>🐾 Animal Daily</Text>
      <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 20 }} />
    </View>
  )
}

export default function RootLayout() {
  const { isAuthenticated, restoreSession } = useAuthStore()
  const [isRestoring, setIsRestoring] = useState(true)

  useEffect(() => {
    restoreSession().finally(() => {
      setIsRestoring(false)
    })
  }, [])

  if (isRestoring) {
    return <LoadingScreen />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <Stack.Screen name="(tabs)" />
          ) : (
            <Stack.Screen name="(auth)" />
          )}
        </Stack>
      </ToastProvider>
    </QueryClientProvider>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E293B',
  },
})
