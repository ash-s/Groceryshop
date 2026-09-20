import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { productApi } from '../api/catalog'
import { getErrorMessage } from '../api/auth'
import type { Product } from '../types'

export default function RestockModal({
  product,
  onClose,
  onRestocked,
}: {
  product: Product
  onClose: () => void
  onRestocked: () => void
}) {
  const suggested = Math.max(1, product.minStock - product.stock, product.soldCount ?? 0)
  const [qty, setQty] = useState(String(suggested))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const low = product.stock <= 0 || product.lowStock

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const quantity = Number(qty)
    if (!Number.isInteger(quantity) || quantity < 1) {
      setError('Enter a whole number of at least 1.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await productApi.restock(product.id, quantity)
      onRestocked()
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Restock Product</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            low ? 'bg-red-600 text-white' : 'bg-gray-50 text-gray-600'
          }`}
        >
          <p className="font-semibold">
            {product.name} {product.code ? `(${product.code})` : ''}
          </p>
          <p>
            Current stock: {product.stock} · min {product.minStock} · sold {product.soldCount ?? 0}
          </p>
        </div>

        {error && <div className="mb-4 px-4 py-2 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to add *</label>
            <input
              type="number"
              min={1}
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400">
              Suggested {suggested} — fills to the min level / matches units sold.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-md text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Restocking…' : 'Restock Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}