import api from './client'

export interface WhatsAppSettings {
  ownerPhone: string
  metaEnabled: boolean
  metaToken: string
  metaPhoneNumberId: string
  metaTemplateName: string
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
}