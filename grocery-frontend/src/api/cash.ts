import api from './client'
import type { CashCount } from '../types'

export interface CashCountPayload {
  date?: string
  n500: number
  n200: number
  n100: number
  n50: number
  n20: number
  n10: number
  n5: number
  n2: number
  n1: number
}

export const cashApi = {
  /** Physical count + expected cash for a day (defaults to today). */
  get: async (date?: string) => {
    const res = await api.get<CashCount>('/cash-counts', { params: date ? { date } : undefined })
    return res.data
  },
  recent: async () => {
    const res = await api.get<CashCount[]>('/cash-counts/recent')
    return res.data
  },
  save: async (data: CashCountPayload) => {
    const res = await api.post<CashCount>('/cash-counts', data)
    return res.data
  },
}
