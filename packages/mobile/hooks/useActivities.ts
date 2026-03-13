import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useActivities(date: string) {
  return useQuery({
    queryKey: ['activities', date],
    queryFn: () => api.getActivities(date),
  })
}

export function useCreateActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createActivity,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['activities', variables.date] })
      queryClient.invalidateQueries({ queryKey: ['daily-summary', variables.date] })
    },
  })
}

export function useUpdateActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any; date: string }) =>
      api.updateActivity(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['activities', variables.date] })
      queryClient.invalidateQueries({ queryKey: ['daily-summary', variables.date] })
    },
  })
}

export function useDeleteActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; date: string }) => api.deleteActivity(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['activities', variables.date] })
      queryClient.invalidateQueries({ queryKey: ['daily-summary', variables.date] })
    },
  })
}

export function useDailySummary(date: string) {
  return useQuery({
    queryKey: ['daily-summary', date],
    queryFn: () => api.getDailySummary(date),
  })
}

export function useUpdateDailySummary() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.updateDailySummary,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['daily-summary', variables.date] })
    },
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  })
}
