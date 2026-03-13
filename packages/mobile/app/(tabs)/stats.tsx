import { View, Text, StyleSheet } from 'react-native'

export default function StatsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>统计</Text>
      <Text style={styles.hint}>记录满 7 天后解锁统计</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  hint: {
    color: '#9CA3AF',
    marginTop: 40,
    textAlign: 'center',
  },
})
