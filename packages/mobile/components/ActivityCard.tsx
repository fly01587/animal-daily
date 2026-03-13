import { useRef } from 'react'
import { View, Text, StyleSheet, Pressable, Animated, PanResponder } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Activity, getLevelMeta } from '@animal-daily/shared'

interface ActivityCardProps {
  activity: Activity
  onPress: () => void
  onDelete: () => void
}

export function ActivityCard({ activity, onPress, onDelete }: ActivityCardProps) {
  const translateX = useRef(new Animated.Value(0)).current
  const levelMeta = getLevelMeta(activity.level)

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 10,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(gestureState.dx)
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -80) {
          Animated.spring(translateX, {
            toValue: -80,
            useNativeDriver: true,
          }).start()
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start()
        }
      },
    })
  ).current

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return null
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }

  return (
    <View style={styles.container}>
      <View style={styles.deleteAction}>
        <Pressable style={styles.deleteButton} onPress={onDelete}>
          <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      <Animated.View
        style={[styles.card, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <Pressable onPress={onPress} style={styles.pressable}>
          <View style={styles.header}>
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{formatTime(activity.createdAt)}</Text>
              {activity.durationMinutes && (
                <Text style={styles.durationText}>{formatDuration(activity.durationMinutes)}</Text>
              )}
            </View>
            <View style={[styles.levelBadge, { backgroundColor: levelMeta.color + '20' }]}>
              <Text style={[styles.levelIcon, { color: levelMeta.color }]}>{levelMeta.icon}</Text>
              <Text style={[styles.levelName, { color: levelMeta.color }]}>{levelMeta.name}</Text>
            </View>
          </View>

          <Text style={styles.content} numberOfLines={3}>
            {activity.content}
          </Text>

          <View style={styles.footer}>
            {activity.categoryName && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryIcon}>{activity.categoryIcon}</Text>
                <Text style={styles.categoryName}>{activity.categoryName}</Text>
              </View>
            )}
          </View>
        </Pressable>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 6,
    position: 'relative',
  },
  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: '#DC2626',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pressable: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginRight: 8,
  },
  durationText: {
    fontSize: 12,
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  levelName: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    fontSize: 16,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  categoryName: {
    fontSize: 12,
    color: '#64748B',
  },
})
