import { useState, useMemo } from 'react'

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  Modal,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Activity } from '@animal-daily/shared'
import { LevelCard } from '../../components/LevelCard'
import { ActivityCard } from '../../components/ActivityCard'
import { ActivityFormSheet } from '../../components/ActivityFormSheet'
import { LevelPicker } from '../../components/LevelPicker'
import {
  useActivities,
  useDeleteActivity,
  useDailySummary,
  useUpdateDailySummary,
} from '../../hooks/useActivities'
import { useToast } from '../../contexts/ToastContext'
import { HomeSkeleton } from '../../components/SkeletonLoader'

function getTodayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

export default function HomeScreen() {
  const { showToast } = useToast()
  const today = useMemo(() => getTodayString(), [])
  const [showForm, setShowForm] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [showLevelModal, setShowLevelModal] = useState(false)

  const { data: activities, isLoading, refetch, isRefetching } = useActivities(today)
  const { refetch: refetchSummary } = useDailySummary(today)
  const deleteMutation = useDeleteActivity()
  const updateSummaryMutation = useUpdateDailySummary()

  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchSummary()])
  }

  const handleAdd = () => {
    setEditingActivity(null)
    setShowForm(true)
  }

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync({ id, date: today })
      showToast('success', '已删除')
    } catch (error) {
      showToast('error', '删除失败')
    }
  }

  const handleUpdateLevel = async (level: number | null) => {
    try {
      await updateSummaryMutation.mutateAsync({ date: today, manualLevel: level })
      showToast('success', '已更新等级')
      setShowLevelModal(false)
    } catch (error) {
      showToast('error', '更新失败')
    }
  }

  const sortedActivities = useMemo(() => {
    if (!activities) return []
    return [...activities].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [activities])

  const renderHeader = () => (
    <View>
      <View style={styles.topBar}>
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString('zh-CN', {
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          })}
        </Text>
        <Pressable style={styles.iconButton}>
          <Ionicons name="notifications-outline" size={24} color="#1E293B" />
        </Pressable>
      </View>
      <LevelCard date={today} onPress={() => setShowLevelModal(true)} />
      <Text style={styles.sectionTitle}>今日记录</Text>
    </View>
  )

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="paw-outline" size={64} color="#E2E8F0" />
      <Text style={styles.emptyText}>今天还没记录，点击 + 开始</Text>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
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
        ListEmptyComponent={isLoading ? <HomeSkeleton /> : renderEmpty()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor="#3B82F6"
          />
        }
      />

      <Pressable style={styles.fab} onPress={handleAdd}>
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </Pressable>

      <ActivityFormSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        editActivity={editingActivity}
        date={today}
      />

      <Modal
        visible={showLevelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLevelModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowLevelModal(false)}>
          <View style={styles.levelModal}>
            <Text style={styles.modalTitle}>修改今日状态</Text>
            <LevelPicker value={null} onChange={handleUpdateLevel} />
            <Pressable style={styles.cancelButton} onPress={() => handleUpdateLevel(null)}>
              <Text style={styles.cancelButtonText}>恢复自动计算</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    paddingBottom: 100,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  dateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  levelModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 14,
  },
})
