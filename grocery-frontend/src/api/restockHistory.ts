import api from './client'
import type { RestockHistoryEvent } from '../types'

export const restockHistoryApi = {
  getAll: async () => {
    const res = await api.get<RestockHistoryEvent[]>('/restock-events')
    return res.data
  },
  getPending: async () => {
    const res = await api.get<RestockHistoryEvent[]>('/restock-events/pending')
    return res.data
  },
  deliver: async (id: number, receivedDate?: string) => {
    const res = await api.put<RestockHistoryEvent>(`/restock-events/${id}/deliver`, null, {
      params: receivedDate ? { receivedDate } : {},
    })
    return res.data
  },
}