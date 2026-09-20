import api from './client'

export interface WhatsAppSettings {
  ownerPhone: string
}

export const settingsApi = {
  getWhatsApp: async () => {
    const res = await api.get<WhatsAppSettings>('/settings/whatsapp')
    return res.data
  },
  updateWhatsApp: async (ownerPhone: string) => {
    const res = await api.put<WhatsAppSettings>('/settings/whatsapp', { ownerPhone })
    return res.data
  },
}