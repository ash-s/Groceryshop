import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { billingApi } from '../api/billing'
import type { CreateBillRequest } from '../types'

export function useBills() {
  return useQuery({
    queryKey: ['bills'],
    queryFn: billingApi.list,
  })
}

export function useCreateBill() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateBillRequest) => billingApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['sales-report'] })
    },
  })
}

export function useSalesReport(period: 'weekly' | 'monthly') {
  return useQuery({
    queryKey: ['sales-report', period],
    queryFn: () => (period === 'weekly' ? billingApi.weeklyReport() : billingApi.monthlyReport()),
  })
}