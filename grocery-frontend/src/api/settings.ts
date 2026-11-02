import api from './client'
import type { LoyaltySettings } from '../types'

export interface WhatsAppSettings {
  ownerPhone: string
  metaEnabled: boolean
  metaToken: string
  metaPhoneNumberId: string
  metaTemplateName: string
}

export interface StockSettings {
  autoRestockEnabled: boolean
}

export interface WhatsAppTestResult {
  enabled: boolean
  ownerPhone: string
  status: 'SIMULATED' | 'SENT' | 'FAILED'
  detail: string
}

export const settingsApi = {
  getWhatsApp: async () => {
    const res = await api.get<WhatsAppSettings>('/settings/whatsapp')
    return res.data
  },
  updateWhatsApp: async (settings: WhatsAppSettings) => {
    const res = await api.put<WhatsAppSettings>('/settings/whatsapp', settings)
    return res.data
  },
  sendTest: async () => {
    const res = await api.post<WhatsAppTestResult>('/settings/whatsapp/test')
    return res.data
  },
  getStock: async () => {
    const res = await api.get<StockSettings>('/settings/stock')
    return res.data
  },
  updateStock: async (settings: StockSettings) => {
    const res = await api.put<StockSettings>('/settings/stock', settings)
    return res.data
  },
  getLoyalty: async () => {
    const res = await api.get<LoyaltySettings>('/settings/loyalty')
    return res.data
  },
  updateLoyalty: async (settings: LoyaltySettings) => {
    const res = await api.put<LoyaltySettings>('/settings/loyalty', settings)
    return res.data
  },
}