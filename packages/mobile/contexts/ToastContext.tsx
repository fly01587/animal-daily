import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_CONFIG: Record<ToastType, {
  bg: string
  border: string
  text: string
  icon: keyof typeof Ionicons.glyphMap
}> = {
  success: {
    bg: '#ECFDF5',
    border: '#22C55E',
    text: '#166534',
    icon: 'checkmark-circle',
  },
  error: {
    bg: '#FEF2F2',
    border: '#DC2626',
    text: '#991B1B',
    icon: 'alert-circle',
  },
  info: {
    bg: '#EFF6FF',
    border: '#3B82F6',
    text: '#1E40AF',
    icon: 'information-circle',
  },
}

const DURATION = 2500
const ANIM_DURATION = 300

function ToastItem({ toast, onDone }: { toast: Toast; onDone: (id: number) => void }) {
  const translateY = useRef(new Animated.Value(-100)).current
  const opacity = useRef(new Animated.Value(0)).current
  const config = TOAST_CONFIG[toast.type]

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: ANIM_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: ANIM_DURATION,
        useNativeDriver: true,
      }),
    ]).start()

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: ANIM_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: ANIM_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => onDone(toast.id))
    }, DURATION)

    return () => clearTimeout(timer)
  }, [])

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: config.bg,
          borderLeftColor: config.border,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Ionicons name={config.icon} size={20} color={config.border} />
      <Text style={[styles.toastText, { color: config.text }]}>{toast.message}</Text>
    </Animated.View>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = ++idRef.current
    setToasts((prev) => [...prev, { id, type, message }])
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={styles.container} pointerEvents="none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDone={removeToast} />
        ))}
      </View>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toastText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
})
