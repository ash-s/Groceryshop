import api from './client'
import type { CartResponse, CartItem } from '../types'

export const cartApi = {
  get: async () => {
    const res = await api.get<CartResponse>('/cart')
    return res.data
  },
  add: async (productId: number, quantity = 1) => {
    const res = await api.post<CartItem>('/cart', { productId, quantity })
    return res.data
  },
  updateQuantity: async (itemId: number, quantity: number) => {
    const res = await api.put<CartItem>(`/cart/${itemId}`, null, { params: { quantity } })
    return res.data
  },
  remove: async (itemId: number) => {
    await api.delete(`/cart/${itemId}`)
  },
  clear: async () => {
    await api.delete('/cart')
  },
}
