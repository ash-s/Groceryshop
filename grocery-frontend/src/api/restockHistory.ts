import api from './client'
import type { RestockHistoryEvent } from '../types'

export const restockHistoryApi = {
  getAll: async () => {
    const res = await api.get<RestockHistoryEvent[]>('/restock-events')
    return res.data
  },
}