import api from './client'
import type { Customer, CustomerRequest, PointEntry } from '../types'

export interface CustomerBroadcastResult {
  sent: number
  skipped: number
  failed: number
}

export const customerApi = {
  list: async (search?: string) => {
    const res = await api.get<Customer[]>('/customers', { params: search ? { search } : undefined })
    return res.data
  },
  getById: async (id: number) => {
    const res = await api.get<Customer>(`/customers/${id}`)
    return res.data
  },
  create: async (data: CustomerRequest) => {
    const res = await api.post<Customer>('/customers', data)
    return res.data
  },
  update: async (id: number, data: CustomerRequest) => {
    const res = await api.put<Customer>(`/customers/${id}`, data)
    return res.data
  },
  delete: async (id: number) => {
    await api.delete(`/customers/${id}`)
  },
  /** Credit (positive) or debit (negative) loyalty points. */
  adjustPoints: async (id: number, points: number, reason?: string) => {
    const res = await api.post<Customer>(`/customers/${id}/points`, { points, reason })
    return res.data
  },
  pointHistory: async (id: number) => {
    const res = await api.get<PointEntry[]>(`/customers/${id}/points`)
    return res.data
  },
  /** Send an offer / price-change message to customers. */
  broadcast: async (data: { message: string; all?: boolean; customerIds?: number[] }) => {
    const res = await api.post<CustomerBroadcastResult>('/customers/broadcast', data)
    return res.data
  },
}
