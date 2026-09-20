import api from './client'
import type { Bill, CreateBillRequest, SalesReport } from '../types'

export const billingApi = {
  list: async () => {
    const res = await api.get<Bill[]>('/bills')
    return res.data
  },
  create: async (data: CreateBillRequest) => {
    const res = await api.post<Bill>('/bills', data)
    return res.data
  },
  weeklyReport: async () => {
    const res = await api.get<SalesReport>('/bills/reports/weekly')
    return res.data
  },
  monthlyReport: async () => {
    const res = await api.get<SalesReport>('/bills/reports/monthly')
    return res.data
  },
}