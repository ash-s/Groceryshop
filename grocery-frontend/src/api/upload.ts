import api from './client'
import type { UploadResponse } from '../types'

export const uploadApi = {
  // Uploads an image file; returns the public URL to store on the entity.
  uploadImage: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const res = await api.post<UploadResponse>('/upload/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },
}