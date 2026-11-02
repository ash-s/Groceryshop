import api from './client'
import type {
  AdminResetPasswordRequest,
  AdminResetPasswordResponse,
  CreateUserRequest,
  User,
} from '../types'

export const adminUserApi = {
  list: async () => {
    const res = await api.get<User[]>('/admin/users')
    return res.data
  },
  create: async (data: CreateUserRequest) => {
    const res = await api.post<User>('/admin/users', data)
    return res.data
  },
  resetPassword: async (id: number, data: AdminResetPasswordRequest) => {
    const res = await api.post<AdminResetPasswordResponse>(`/admin/users/${id}/reset-password`, data)
    return res.data
  },
  updateRole: async (id: number, role: 'STAFF' | 'ADMIN') => {
    const res = await api.put<User>(`/admin/users/${id}/role`, { role })
    return res.data
  },
  updateSalary: async (id: number, monthlySalary: number | null) => {
    const res = await api.put<User>(`/admin/users/${id}/salary`, { monthlySalary })
    return res.data
  },
  delete: async (id: number) => {
    await api.delete(`/admin/users/${id}`)
  },
}