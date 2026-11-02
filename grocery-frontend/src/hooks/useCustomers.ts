import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cashApi, type CashCountPayload } from '../api/cash'
import { customerApi } from '../api/customers'
import type { CustomerRequest } from '../types'

export function useCustomers(search?: string) {
  return useQuery({
    queryKey: ['customers', search ?? ''],
    queryFn: () => customerApi.list(search),
  })
}

export function useCustomerPointHistory(id: number | null) {
  return useQuery({
    queryKey: ['customer-points', id],
    queryFn: () => customerApi.pointHistory(id as number),
    enabled: !!id,
  })
}

export function useSaveCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: CustomerRequest }) =>
      id ? customerApi.update(id, data) : customerApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export function useAdjustPoints() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, points, reason }: { id: number; points: number; reason?: string }) =>
      customerApi.adjustPoints(id, points, reason),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer-points', variables.id] })
    },
  })
}

export function useCashCount(date?: string) {
  return useQuery({
    queryKey: ['cash-count', date ?? 'today'],
    queryFn: () => cashApi.get(date),
  })
}

export function useSaveCashCount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CashCountPayload) => cashApi.save(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-count'] })
      queryClient.invalidateQueries({ queryKey: ['cash-recent'] })
    },
  })
}
