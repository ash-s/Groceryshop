import api from './client'
import type { BarcodeCatalogEntry, BarcodeLookup } from '../types'

/** Client for the built-in barcode catalog (reference list of common grocery items). */
export const barcodeApi = {
  catalog: async (params?: { search?: string; category?: string }) => {
    const res = await api.get<BarcodeCatalogEntry[]>('/barcodes/catalog', { params })
    return res.data
  },
  /** Resolves a scanned code to a catalog item. Rejects (404) when unknown. */
  lookup: async (code: string) => {
    const res = await api.get<BarcodeCatalogEntry>('/barcodes/lookup', { params: { code } })
    return res.data
  },
  /** Resolves a scanned code: built-in catalog first, then Open Food Facts online. */
  resolve: async (code: string) => {
    const res = await api.get<BarcodeLookup>('/barcodes/resolve', { params: { code } })
    return res.data
  },
  /** Search Open Food Facts by product name (returns normalized lookup rows). */
  search: async (q: string, limit?: number) => {
    const res = await api.get<BarcodeLookup[]>('/barcodes/search', { params: { q, limit } })
    return res.data
  },
  /** Add an item to the built-in catalog (e.g. saved from an online search). */
  addToCatalog: async (data: {
    code?: string | null
    name: string
    brand?: string | null
    category?: string | null
  }) => {
    const res = await api.post<BarcodeCatalogEntry>('/barcodes/catalog', data)
    return res.data
  },
  /** Attach / update a barcode on a catalog item (scan-to-set). */
  setCode: async (id: number, code: string) => {
    const res = await api.put<BarcodeCatalogEntry>(`/barcodes/catalog/${id}/code`, null, {
      params: { code },
    })
    return res.data
  },
}