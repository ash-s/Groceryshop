import api from './client'
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
} from '../types'

export interface ApiError {
  message: string
  fieldErrors?: Record<string, string>
}

export const authApi = {
  login: async (data: LoginRequest) => {
    const res = await api.post<AuthResponse>('/auth/login', data)
    return res.data
  },
  register: async (data: RegisterRequest) => {
    const res = await api.post<AuthResponse>('/auth/register', data)
    return res.data
  },
}

export function getErrorMessage(error: unknown): string {
  const err = error as { response?: { data?: ApiError } }
  return err.response?.data?.message ?? 'Something went wrong. Please try again.'
}
