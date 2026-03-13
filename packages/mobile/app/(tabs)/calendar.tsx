import { useState, useMemo } from 'react'
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { getLevelMeta } from '@animal-daily/shared'
import { useCalendar } from '../../hooks/useCalendar'
import { CalendarSkeleton } from '../../components/SkeletonLoader'


const { width } = Dimensions.get('window')
const CELL_SIZE = (width - 32) / 7

const LEVEL_COLORS: Record<string, string> = {
  '夯': '#FF6B35',
  '顶级': '#8B5CF6',
  '人上人': '#22C55E',
  'NPC': '#9CA3AF',
  '拉完了': '#DC2626',
  'no record': '#E2E8F0',
}

function getCalendarDays(year: number, month: number) {
  const firstDayOfMonth = new Date(year, month - 1, 1)
  const lastDayOfMonth = new Date(year, month, 0)
  
  const daysInMonth = lastDayOfMonth.getDate()
  const startDayOfWeek = firstDayOfMonth.getDay() || 7 // 1 (Mon) to 7 (Sun)
  
  const days = []
  
  // Previous month days
  const prevMonthLastDay = new Date(year, month - 1, 0).getDate()
  for (let i = startDayOfWeek - 1; i > 0; i--) {
    const d = prevMonthLastDay - i + 1
    const date = new Date(year, month - 2, d)
    days.push({
      date: date.toISOString().split('T')[0],
      day: d,
      isCurrentMonth: false,
    })
  }
  
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month - 1, i)
    days.push({
      date: date.toISOString().split('T')[0],
      day: i,
      isCurrentMonth: true,
    })
  }
  
  // Next month days
  const remainingCells = 42 - days.length
  for (let i = 1; i <= remainingCells; i++) {
    const date = new Date(year, month, i)
    days.push({
      date: date.toISOString().split('T')[0],
      day: i,
      isCurrentMonth: false,
    })
  }
  
  return days
}

export default function CalendarScreen() {
  const router = useRouter()
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState(todayStr)
  
  const { data: calendarData, isLoading: isCalendarLoading } = useCalendar(currentYear, currentMonth)

  
  const days = useMemo(() => getCalendarDays(currentYear, currentMonth), [currentYear, currentMonth])
  
  const selectedDayData = useMemo(() => {
    return calendarData?.find(d => d.date === selectedDate)
  }, [calendarData, selectedDate])

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(currentYear - 1)
      setCurrentMonth(12)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(currentYear + 1)
      setCurrentMonth(1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const isToday = dateStr === todayStr
    
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const weekDay = weekDays[date.getDay()]
    
    return `${month}月${day}日 (${isToday ? '今天' : weekDay})`
  }

  if (isCalendarLoading && !calendarData) {
    return <CalendarSkeleton />
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handlePrevMonth} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={24} color="#1E293B" />
        </Pressable>
        <Text style={styles.headerTitle}>{currentYear}年{currentMonth}月</Text>
        <Pressable onPress={handleNextMonth} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={24} color="#1E293B" />
        </Pressable>
      </View>

      <View style={styles.weekHeader}>
        {['一', '二', '三', '四', '五', '六', '日'].map(d => (
          <Text key={d} style={styles.weekDayText}>{d}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((item, index) => {
          const dayData = calendarData?.find(d => d.date === item.date)
          const isToday = item.date === todayStr
          const isSelected = item.date === selectedDate
          const isFuture = !!todayStr && !!item.date && item.date > todayStr


          const levelColor = dayData?.levelName ? LEVEL_COLORS[dayData.levelName] : LEVEL_COLORS['no record']

          return (
            <Pressable
              key={index}
              style={[
                styles.cell,
                isSelected && styles.selectedCell,
                isToday && styles.todayCell,
                !item.isCurrentMonth && styles.otherMonthCell,
                isFuture && styles.futureCell
              ]}
              onPress={() => !isFuture && setSelectedDate(item.date)}
              disabled={isFuture}
            >
              <Text style={[
                styles.dayText,
                !item.isCurrentMonth && styles.otherMonthDayText
              ]}>
                {item.day}
              </Text>
              <View style={[styles.dot, { backgroundColor: levelColor }]} />
            </Pressable>
          )
        })}
      </View>

      <View style={styles.legend}>
        {Object.entries(LEVEL_COLORS).map(([name, color]) => (
          <View key={name} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{name === 'no record' ? '无记录' : name}</Text>
          </View>
        ))}
      </View>

      {selectedDate && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryDate}>{formatDateDisplay(selectedDate)}</Text>
            <Pressable onPress={() => router.push(`/day/${selectedDate}`)}>
              <Text style={styles.detailLink}>查看详情 →</Text>
            </Pressable>
          </View>
          
          {selectedDayData ? (
            <View style={styles.summaryContent}>
              <View style={styles.levelInfo}>
                <Text style={styles.levelIcon}>{getLevelMeta(selectedDayData.level).icon}</Text>
                <Text style={styles.levelName}>{selectedDayData.levelName}</Text>
              </View>
              <View style={styles.statsInfo}>
                <Text style={styles.statsText}>共 {selectedDayData.count} 项活动</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noDataText}>暂无记录</Text>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  navBtn: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginHorizontal: 20,
  },
  weekHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  weekDayText: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
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
    borderRadius: 8,
    marginVertical: 2,
  },
  todayCell: {
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 24,
  },
  selectedCell: {
    backgroundColor: '#EFF6FF',
  },
  otherMonthCell: {
    opacity: 0.5,
  },
  futureCell: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  otherMonthDayText: {
    color: '#9CA3AF',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
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
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#64748B',
  },
  summaryCard: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  detailLink: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  levelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  statsInfo: {
    alignItems: 'flex-end',
  },
  statsText: {
    fontSize: 14,
    color: '#64748B',
  },
  noDataText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
})
