import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Activity } from '@animal-daily/shared'
import { LevelPicker } from './LevelPicker'
import { useCategories, useCreateActivity, useUpdateActivity } from '../hooks/useActivities'
import { useToast } from '../contexts/ToastContext'

interface ActivityFormSheetProps {
  visible: boolean
  onClose: () => void
  editActivity?: Activity | null
  date: string
}

export function ActivityFormSheet({ visible, onClose, editActivity, date }: ActivityFormSheetProps) {
  const { showToast } = useToast()
  const [content, setContent] = useState('')
  const [level, setLevel] = useState<number | null>(null)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')

  const { data: categories } = useCategories()
  const createMutation = useCreateActivity()
  const updateMutation = useUpdateActivity()

  useEffect(() => {
    if (editActivity) {
      setContent(editActivity.content)
      setLevel(editActivity.level)
      setCategoryId(editActivity.categoryId || null)
      if (editActivity.durationMinutes) {
        setHours(Math.floor(editActivity.durationMinutes / 60).toString())
        setMinutes((editActivity.durationMinutes % 60).toString())
      } else {
        setHours('')
        setMinutes('')
      }
    } else {
      setContent('')
      setLevel(null)
      setCategoryId(null)
      setHours('')
      setMinutes('')
    }
  }, [editActivity, visible])

  const handleSave = async () => {
    if (!content || level === null) return

    const durationMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0)
    const data = {
      content,
      level,
      categoryId,
      durationMinutes: durationMinutes || null,
      date,
    }

    try {
      if (editActivity) {
        await updateMutation.mutateAsync({ id: editActivity.id, data, date })
      } else {
        await createMutation.mutateAsync(data)
      }
      showToast('success', editActivity ? '已更新' : '已保存')
      onClose()
    } catch (error) {
      showToast('error', '保存失败，请重试')
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheetContainer}
      >
        <View style={styles.sheet}>
          <View style={styles.dragHandle} />
          <View style={styles.header}>
            <Text style={styles.title}>{editActivity ? '编辑记录' : '新记录'}</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
            <TextInput
              style={styles.input}
              placeholder="做了什么..."
              multiline
              autoFocus={!editActivity}
              value={content}
              onChangeText={setContent}
            />

            <Text style={styles.sectionTitle}>状态</Text>
            <LevelPicker value={level} onChange={setLevel} />

            <Text style={styles.sectionTitle}>分类</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {categories?.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategoryId(categoryId === cat.id ? null : cat.id)}
                  style={[
                    styles.categoryChip,
                    categoryId === cat.id && { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
                  ]}
                >
                  <Text style={[styles.categoryIcon, categoryId === cat.id && { color: '#FFFFFF' }]}>
                    {cat.icon}
                  </Text>
                  <Text style={[styles.categoryName, categoryId === cat.id && { color: '#FFFFFF' }]}>
                    {cat.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.sectionTitle}>时长 (可选)</Text>
            <View style={styles.durationContainer}>
              <View style={styles.durationInputGroup}>
                <TextInput
                  style={styles.durationInput}
                  keyboardType="numeric"
                  placeholder="0"
                  value={hours}
                  onChangeText={setHours}
                />
                <Text style={styles.durationLabel}>小时</Text>
              </View>
              <View style={styles.durationInputGroup}>
                <TextInput
                  style={styles.durationInput}
                  keyboardType="numeric"
                  placeholder="0"
                  value={minutes}
                  onChangeText={setMinutes}
                />
                <Text style={styles.durationLabel}>分钟</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>日期</Text>
            <View style={styles.dateDisplay}>
              <Ionicons name="calendar-outline" size={16} color="#64748B" style={{ marginRight: 8 }} />
              <Text style={styles.dateText}>{date}</Text>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          <Pressable
            style={[styles.saveButton, (!content || level === null || isPending) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!content || level === null || isPending}
          >
            {isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>保存</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '75%',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  contentScroll: {
    flex: 1,
  },
  input: {
    fontSize: 18,
    color: '#1E293B',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 12,
    marginTop: 8,
  },
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
    backgroundColor: '#F8FAFC',
  },
  categoryIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  categoryName: {
    fontSize: 14,
    color: '#64748B',
  },
  durationContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  durationInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  durationInput: {
    backgroundColor: '#F1F5F9',
    width: 60,
    height: 40,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginRight: 8,
  },
  durationLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  dateText: {
    fontSize: 14,
    color: '#1E293B',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
})
