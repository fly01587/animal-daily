import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native'
import { useAuthStore } from '../../stores/auth.store'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

export default function ProfileScreen() {
  const { user, logout } = useAuthStore()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.replace('/(auth)/login')
  }

  const menuItems = [
    { icon: '📋', label: '分类管理' },
    { icon: '🎯', label: '我的目标', badge: 'P1', dimmed: true },
    { icon: '🔔', label: '提醒设置' },
    { icon: '📤', label: '数据导出', badge: 'P2', dimmed: true },
    { icon: '🌐', label: '语言' },
    { icon: 'ℹ️', label: '关于' },
  ]

  return (
    <View style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user?.nickname ? user.nickname.charAt(0).toUpperCase() : '👤'}
            </Text>
          </View>
          <Text style={styles.nickname}>{user?.nickname ?? '未登录'}</Text>
          <Text style={styles.email}>{user?.email ?? '请先登录'}</Text>
        </View>

        {/* Menu Items Card */}
        <View style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <View key={item.label}>
              <Pressable
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.menuItemPressed,
                  item.dimmed && styles.dimmed,
                ]}
                onPress={() => {}}
              >
                <View style={styles.menuItemLeft}>
                  <Text style={styles.menuIcon}>{item.icon}</Text>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
              </Pressable>
              {index < menuItems.length - 1 && <View style={styles.separator} />}
            </View>
          ))}
        </View>

        {/* Logout Button */}
        <Pressable
          style={({ pressed }) => [
            styles.logoutBtn,
            pressed && styles.logoutBtnPressed,
          ]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>退出登录</Text>
        </Pressable>

        {/* Version Text */}
        <Text style={styles.versionText}>Animal Daily v0.1.0</Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#64748B',
  },
  nickname: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  email: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    paddingHorizontal: 16,
  },
  menuItemPressed: {
    backgroundColor: '#F8FAFC',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 16,
    color: '#1E293B',
  },
  badge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: 'bold',
  },
  dimmed: {
    opacity: 0.5,
  },
  separator: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 16,
  },
  logoutBtn: {
    marginTop: 32,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  logoutBtnPressed: {
    opacity: 0.8,
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
  versionText: {
    marginTop: 40,
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
  },
})
