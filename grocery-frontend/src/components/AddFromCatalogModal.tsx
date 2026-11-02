import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { productApi } from '../api/catalog'
import { getErrorMessage } from '../api/auth'
import { useCategories, useSuppliers } from '../hooks/useCatalog'

export interface QuickAddInitial {
  name: string
  code: string
  brand: string | null
  category: string | null
  /** Where the pre-filled details came from, if not typed by the user. */
  source?: 'CATALOG' | 'OPENFOODFACTS' | null
  imageUrl?: string | null
}

interface Props {
  initial: QuickAddInitial
  title?: string
  /** Extra context line shown under the title. */
  subtitle?: string
  onClose: () => void
  onSaved: () => void
}

/**
 * Quick-create a real product from a scanned barcode / catalog item.
 * Name, brand and code are pre-filled from the scan; the user sets their
 * own price, rack and current stock. Saving makes future scans resolve.
 */
export default function AddFromCatalogModal({ initial, title, subtitle, onClose, onSaved }: Props) {
  const queryClient = useQueryClient()
  const { data: categories } = useCategories()
  const { data: suppliers } = useSuppliers()

  const presetCategory = categories?.find(
    (c) => initial.category && c.name.trim().toLowerCase() === initial.category.trim().toLowerCase()
  )

  const [form, setForm] = useState(() => ({
    name: initial.name,
    code: initial.code,
    brand: initial.brand ?? '',
    rack: '',
    price: '',
    stock: '',
    minStock: '10',
    categoryId: presetCategory ? String(presetCategory.id) : '',
    supplierId: '',
  }))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const price = Number(form.price)
    const stock = Number(form.stock)
    if (form.price === '' || Number.isNaN(price) || price < 0) {
      setError('Enter a valid selling price.')
      return
    }
    if (form.stock === '' || Number.isNaN(stock) || stock < 0) {
      setError('Enter current stock (0 is fine — stock can be added by scanning after saving).')
      return
    }
    setLoading(true)
    setError('')
    try {
      await productApi.create({
        name: form.name,
        barcode: form.code.trim() || undefined,
        brand: form.brand.trim() || undefined,
        rack: form.rack.trim() || undefined,
        price,
        stock,
        minStock: Number(form.minStock || 10),
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        supplierId: form.supplierId ? Number(form.supplierId) : null,
      })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['low-stock'] })
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-1">{title ?? 'Add as Product'}</h3>
        <p className="text-xs text-gray-500 mb-4">
          {subtitle ??
            'From the built-in barcode catalog — set your selling price, rack and current stock. Once saved, every future scan of this barcode resolves to this product.'}
        </p>

        {(initial.source || initial.imageUrl) && (
          <div className="flex items-center gap-3 mb-4 rounded-lg border border-green-200 bg-green-50 p-2">
            {initial.imageUrl && (
              <img
                src={initial.imageUrl}
                alt=""
                className="h-12 w-12 rounded-md object-cover bg-white border border-green-200"
              />
            )}
            {initial.source && (
              <span className="text-xs font-medium text-green-800">
                {initial.source === 'OPENFOODFACTS'
                  ? 'Details looked up online from Open Food Facts'
                  : 'Details from the built-in barcode catalog'}
              </span>
            )}
          </div>
        )}

        {error && <div className="mb-4 px-4 py-2 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Barcode *</label>
            <input
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className={`${inputClass} font-mono`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <input
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rack / shelf</label>
              <input
                value={form.rack}
                onChange={(e) => setForm({ ...form, rack: e.target.value })}
                placeholder="e.g. A2"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current stock *</label>
              <input
                required
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min stock</label>
              <input
                type="number"
                min="0"
                value={form.minStock}
                onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className={inputClass}
              >
                <option value="">None</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <select
              value={form.supplierId}
              onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
              className={inputClass}
            >
              <option value="">None</option>
              {suppliers?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-gray-600 border hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}