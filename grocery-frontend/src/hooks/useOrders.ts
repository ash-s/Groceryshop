import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orderApi } from '../api/orders'

export function useMyOrders() {
  return useQuery({
    queryKey: ['orders-mine'],
    queryFn: orderApi.getMine,
  })
}

export function useAllOrders() {
  return useQuery({
    queryKey: ['orders-all'],
    queryFn: orderApi.getAll,
  })
}

export function usePlaceOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ deliveryAddress, paymentMethod }: { deliveryAddress: string; paymentMethod: string }) =>
      orderApi.place(deliveryAddress, paymentMethod),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      queryClient.invalidateQueries({ queryKey: ['orders-mine'] })
      queryClient.invalidateQueries({ queryKey: ['orders-all'] })
    },
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      orderApi.updateStatus(id, status as never),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders-all'] })
      queryClient.invalidateQueries({ queryKey: ['orders-mine'] })
    },
  })
}
