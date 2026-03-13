import { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated, Dimensions } from 'react-native'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// ─── Animated Shimmer Box ────────────────────────────────────────────

interface SkeletonBoxProps {
  width: number | string
  height: number
  borderRadius?: number
  style?: object
}

export function SkeletonBox({ width, height, borderRadius = 8, style }: SkeletonBoxProps) {
  const opacity = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [])

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: '#E2E8F0',
          opacity,
        },
        style,
      ]}
    />
  )
}

// ─── Home Screen Skeleton ────────────────────────────────────────────

export function HomeSkeleton() {
  return (
    <View style={homeStyles.container}>
      {/* Top bar skeleton */}
      <View style={homeStyles.topBar}>
        <SkeletonBox width={140} height={24} borderRadius={6} />
        <SkeletonBox width={40} height={40} borderRadius={20} />
      </View>

      {/* Level card skeleton */}
      <View style={homeStyles.levelCard}>
        <View style={homeStyles.levelHeader}>
          <SkeletonBox width={40} height={40} borderRadius={20} />
          <View style={{ marginLeft: 12 }}>
            <SkeletonBox width={60} height={12} borderRadius={4} />
            <SkeletonBox width={80} height={20} borderRadius={6} style={{ marginTop: 6 }} />
          </View>
        </View>
        <View style={homeStyles.levelStats}>
          <View style={homeStyles.statItem}>
            <SkeletonBox width={40} height={20} borderRadius={6} />
            <SkeletonBox width={50} height={12} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
          <View style={homeStyles.divider} />
          <View style={homeStyles.statItem}>
            <SkeletonBox width={40} height={20} borderRadius={6} />
            <SkeletonBox width={60} height={12} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
        </View>
      </View>

      {/* Section title skeleton */}
      <SkeletonBox width={70} height={16} borderRadius={4} style={{ marginHorizontal: 20, marginTop: 12, marginBottom: 12 }} />

      {/* Activity card skeletons */}
      {[1, 2, 3].map((i) => (
        <View key={i} style={homeStyles.activityCard}>
          <View style={homeStyles.activityRow}>
            <SkeletonBox width={32} height={32} borderRadius={16} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <SkeletonBox width="80%" height={16} borderRadius={4} style={{ width: i === 2 ? '60%' : '80%' }} />
              <View style={homeStyles.activityMeta}>
                <SkeletonBox width={50} height={12} borderRadius={4} />
                <SkeletonBox width={40} height={12} borderRadius={4} />
                <SkeletonBox width={30} height={12} borderRadius={4} />
              </View>
            </View>
          </View>
        </View>
      ))}
    </View>
  )
}

const homeStyles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  levelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  levelStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  activityMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
})

// ─── Calendar Screen Skeleton ────────────────────────────────────────

const CELL_SIZE = (SCREEN_WIDTH - 32) / 7

export function CalendarSkeleton() {
  return (
    <View style={calStyles.container}>
      {/* Month header skeleton */}
      <View style={calStyles.header}>
        <SkeletonBox width={24} height={24} borderRadius={12} />
        <SkeletonBox width={120} height={20} borderRadius={6} />
        <SkeletonBox width={24} height={24} borderRadius={12} />
      </View>

      {/* Weekday header skeleton */}
      <View style={calStyles.weekHeader}>
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <SkeletonBox key={d} width={16} height={12} borderRadius={4} style={{ width: CELL_SIZE, alignSelf: 'center' }} />
        ))}
      </View>

      {/* Calendar grid skeleton — 6 rows x 7 cols */}
      <View style={calStyles.grid}>
        {Array.from({ length: 42 }).map((_, i) => (
          <View key={i} style={calStyles.cell}>
            <SkeletonBox width={16} height={14} borderRadius={4} />
            <SkeletonBox width={8} height={8} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>

      {/* Legend skeleton */}
      <View style={calStyles.legend}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={calStyles.legendItem}>
            <SkeletonBox width={8} height={8} borderRadius={4} />
            <SkeletonBox width={30} height={10} borderRadius={4} style={{ marginLeft: 4 }} />
          </View>
        ))}
      </View>
    </View>
  )
}

const calStyles = StyleSheet.create({
  container: {
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 20,
  },
  weekHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
})
