import api from './client'
import type { Bill } from '../types'

export interface BridgeSessionView {
  id: string
  code: string
  phoneUrl: string | null
  mode: string
  phoneConnected: boolean
  phoneLabel: string | null
  expiresInSeconds: number
}

export interface BridgeScanResult {
  ok: boolean
  code: string
  productId: number | null
  name: string | null
  price: number | null
  stock: number | null
  message: string | null
  mode: string
  at: string
}

export interface BridgeCartLine {
  productId: number
  name: string
  price: number
  quantity: number
}

export interface BridgeCart {
  total: number
  quantity: number
  lines: BridgeCartLine[]
}

export interface JoinResponse {
  id: string
  mode: string
  bridgeToken: string
  shopToken: string
  phoneUrl: string | null
  canBill: boolean
}

export const bridgeApi = {
  createSession: async (): Promise<BridgeSessionView> => {
    const res = await api.post<BridgeSessionView>('/bridge/session')
    return res.data
  },
  getSession: async (id: string): Promise<BridgeSessionView> => {
    const res = await api.get<BridgeSessionView>(`/bridge/session/${id}`)
    return res.data
  },
  setMode: async (id: string, mode: string): Promise<BridgeSessionView> => {
    const res = await api.post<BridgeSessionView>(`/bridge/session/${id}/mode`, { mode })
    return res.data
  },
  join: async (body: { code?: string; token?: string; device?: string }): Promise<JoinResponse> => {
    const res = await api.post<JoinResponse>('/bridge/join', body)
    return res.data
  },
  scan: async (token: string, code: string): Promise<BridgeScanResult> => {
    const res = await api.post<BridgeScanResult>('/bridge/scan', { token, code })
    return res.data
  },
  state: async (token: string): Promise<{ mode: string; active: boolean }> => {
    const res = await api.get<{ mode: string; active: boolean }>('/bridge/state', { params: { token } })
    return res.data
  },
  cart: async (token: string, cart: BridgeCart): Promise<void> => {
    await api.post('/bridge/cart', { token, ...cart })
  },
  setPhoneMode: async (token: string, mode: string): Promise<{ mode: string; active: boolean }> => {
    const res = await api.post<{ mode: string; active: boolean }>('/bridge/phone-mode', { token, mode })
    return res.data
  },
}

export type BridgeBill = Bill
