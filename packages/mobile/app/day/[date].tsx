import { useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Activity } from '@animal-daily/shared'
import { LevelCard } from '../../components/LevelCard'
import { ActivityCard } from '../../components/ActivityCard'
import { ActivityFormSheet } from '../../components/ActivityFormSheet'
import { useActivities, useDeleteActivity } from '../../hooks/useActivities'
import { useToast } from '../../contexts/ToastContext'


export default function DayDetailScreen() {
  const { showToast } = useToast()
  const { date } = useLocalSearchParams<{ date: string }>()
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)

  const { data: activities, isLoading } = useActivities(date)

  const deleteMutation = useDeleteActivity()

  const isWithinLast7Days = useMemo(() => {
    const d = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffTime = today.getTime() - d.getTime()
    const diffDays = diffTime / (1000 * 60 * 60 * 24)
    return diffDays >= 0 && diffDays < 7
  }, [date])

  const sortedActivities = useMemo(() => {
    if (!activities) return []
    return [...activities].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [activities])

  const handleEdit = (activity: Activity) => {
    if (!isWithinLast7Days) return
    setEditingActivity(activity)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!isWithinLast7Days) return
    try {
      await deleteMutation.mutateAsync({ id, date })
      showToast('success', '已删除')
    } catch (error) {
      showToast('error', '删除失败')
    }
  }

  const formatDateTitle = (dateStr: string) => {
    const d = new Date(dateStr)
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${weekDays[d.getDay()]}`
  }

  const renderHeader = () => (
    <View>
      <LevelCard date={date} />
      <Text style={styles.sectionTitle}>当日记录</Text>
    </View>
  )

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="paw-outline" size={64} color="#E2E8F0" />
      <Text style={styles.emptyText}>当日暂无记录</Text>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </Pressable>
        <Text style={styles.dateTitle}>{formatDateTitle(date)}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={sortedActivities}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ActivityCard
              activity={item}
              onPress={() => handleEdit(item)}
              onDelete={() => handleDelete(item.id)}
            />
          )}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
        />
      )}

      {isWithinLast7Days && (
        <Pressable style={styles.fab} onPress={() => {
          setEditingActivity(null)
          setShowForm(true)
        }}>
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </Pressable>
      )}

      <ActivityFormSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        editActivity={editingActivity}
        date={date}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    color: '#94A3B8',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
})
