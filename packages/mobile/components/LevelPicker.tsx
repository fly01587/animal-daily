import { View, Text, Pressable, StyleSheet } from 'react-native'
import { LEVELS } from '@animal-daily/shared'

interface LevelPickerProps {
  value: number | null
  onChange: (level: number) => void
}

export function LevelPicker({ value, onChange }: LevelPickerProps) {
  return (
    <View style={styles.container}>
      {LEVELS.map((level) => {
        const isSelected = value === level.value
        return (
          <Pressable
            key={level.value}
            onPress={() => onChange(level.value)}
            style={[
              styles.levelButton,
              isSelected && { borderColor: level.color, transform: [{ scale: 1.1 }] },
            ]}
          >
            <Text style={styles.icon}>{level.icon}</Text>
            <Text style={[styles.label, isSelected && { color: level.color, fontWeight: '600' }]}>
              {level.name}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  levelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#F1F5F9',
  },
  icon: {
    fontSize: 20,
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    color: '#64748B',
  },
})
