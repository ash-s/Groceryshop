import api from './client'
import type { Order, OrderStatus } from '../types'

export const orderApi = {
  place: async (deliveryAddress: string, paymentMethod = 'CASH_ON_DELIVERY') => {
    const res = await api.post<Order>('/orders', { deliveryAddress, paymentMethod })
    return res.data
  },
  getMine: async () => {
    const res = await api.get<Order[]>('/orders')
    return res.data
  },
  getById: async (id: number) => {
    const res = await api.get<Order>(`/orders/${id}`)
    return res.data
  },
  getAll: async () => {
    const res = await api.get<Order[]>('/orders/admin/all')
    return res.data
  },
  updateStatus: async (id: number, status: OrderStatus) => {
    const res = await api.patch<Order>(`/orders/admin/${id}/status`, null, { params: { status } })
    return res.data
  },
}
