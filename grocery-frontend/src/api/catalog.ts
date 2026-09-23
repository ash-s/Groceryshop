import api from './client'
import type { Category, Product, Supplier } from '../types'

export interface RestockPayload {
  quantity: number
  deliveryMethod?: string
  costPerUnit?: number
  receivedAt?: string
  expectedDelivery?: string
  notes?: string
}

export const productApi = {
  getAll: async (params?: { categoryId?: number; search?: string }) => {
    const res = await api.get<Product[]>('/products', { params })
    return res.data
  },
  getById: async (id: number) => {
    const res = await api.get<Product>(`/products/${id}`)
    return res.data
  },
  getLowStock: async () => {
    const res = await api.get<Product[]>('/products/low-stock/check')
    return res.data
  },
  create: async (data: Partial<Product>) => {
    const res = await api.post<Product>('/products', data)
    return res.data
  },
  update: async (id: number, data: Partial<Product>) => {
    const res = await api.put<Product>(`/products/${id}`, data)
    return res.data
  },
  updateStock: async (id: number, stock: number) => {
    const res = await api.patch<Product>(`/products/${id}/stock`, null, { params: { stock } })
    return res.data
  },
  restock: async (id: number, payload: RestockPayload) => {
    const res = await api.patch<Product>(`/products/${id}/restock`, payload)
    return res.data
  },
  delete: async (id: number) => {
    await api.delete(`/products/${id}`)
  },
}

export const categoryApi = {
  getAll: async () => {
    const res = await api.get<Category[]>('/categories')
    return res.data
  },
  create: async (data: Partial<Category>) => {
    const res = await api.post<Category>('/categories', data)
    return res.data
  },
  update: async (id: number, data: Partial<Category>) => {
    const res = await api.put<Category>(`/categories/${id}`, data)
    return res.data
  },
  delete: async (id: number) => {
    await api.delete(`/categories/${id}`)
  },
}

export const supplierApi = {
  getAll: async () => {
    const res = await api.get<Supplier[]>('/admin/suppliers')
    return res.data
  },
  getById: async (id: number) => {
    const res = await api.get<Supplier>(`/admin/suppliers/${id}`)
    return res.data
  },
  create: async (data: Partial<Supplier>) => {
    const res = await api.post<Supplier>('/admin/suppliers', data)
    return res.data
  },
  update: async (id: number, data: Partial<Supplier>) => {
    const res = await api.put<Supplier>(`/admin/suppliers/${id}`, data)
    return res.data
  },
  delete: async (id: number) => {
    await api.delete(`/admin/suppliers/${id}`)
  },
}
