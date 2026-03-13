import { View, Text, StyleSheet, Pressable } from 'react-native'
import { getLevelMeta } from '@animal-daily/shared'
import { useDailySummary } from '../hooks/useActivities'

interface LevelCardProps {
  date: string
  onPress?: () => void
}

export function LevelCard({ date, onPress }: LevelCardProps) {
  const { data: summary, isLoading } = useDailySummary(date)

  if (isLoading || !summary) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    )
  }

  const levelMeta = getLevelMeta(summary.effectiveLevel)

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { borderColor: levelMeta.color, borderLeftWidth: 8 }]}
    >
      <View style={styles.header}>
        <View style={styles.levelInfo}>
          <Text style={styles.levelIcon}>{levelMeta.icon}</Text>
          <View>
            <Text style={styles.levelLabel}>今日状态</Text>
            <Text style={[styles.levelName, { color: levelMeta.color }]}>{levelMeta.name}</Text>
          </View>
        </View>
        {summary.manualLevel !== null && (
          <View style={styles.manualBadge}>
            <Text style={styles.manualText}>手动</Text>
          </View>
        )}
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{summary.totalActivities}</Text>
          <Text style={styles.statLabel}>记录数</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{summary.totalMinutes}</Text>
          <Text style={styles.statLabel}>总时长 (m)</Text>
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  loadingCard: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#64748B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  levelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  levelLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  levelName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  manualBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  manualText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  stats: {
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
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
})
