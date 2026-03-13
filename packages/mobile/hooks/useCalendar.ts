import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useCalendar(year: number, month: number) {
  return useQuery({
    queryKey: ['calendar', year, month],
    queryFn: () => api.getCalendar(year, month),
  })
}
