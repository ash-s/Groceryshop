import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useProducts } from '../../hooks/useCatalog'
import { productApi } from '../../api/catalog'
import { getErrorMessage } from '../../api/auth'
import type { Product } from '../../types'

const rank = (p: Product) => (p.stock <= 0 ? 2 : p.lowStock ? 1 : 0)

interface AdjustTarget {
  id: number
  name: string
  current: number
  mode: 'in' | 'out'
}

export default function Stock() {
  const queryClient = useQueryClient()
  const { data: products, isLoading } = useProducts()
  const [search, setSearch] = useState('')
  const [target, setTarget] = useState<AdjustTarget | null>(null)
  const [qty, setQty] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const filtered = products
    ?.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => rank(a) - rank(b))

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['products'] })

  const submitAdjust = async () => {
    if (!target) return
    const value = parseInt(qty, 10)
    if (!value || value <= 0) {
      setError('Enter a valid quantity.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const delta = target.mode === 'in' ? value : -value
      await productApi.updateStock(target.id, Math.max(0, target.current + delta))
      setTarget(null)
      setQty('')
      refresh()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) return <div className="text-center py-16">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Stock Details</h2>
      </div>

      <input
        type="text"
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm px-3 py-2 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
      />

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Product</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Category</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Price</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Current Stock</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Min Stock</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered?.map((product) => {
              const out = product.stock <= 0
              const low = !out && product.lowStock
              const status = out
                ? { label: 'Out of Stock', cls: 'bg-red-100 text-red-700' }
                : low
                  ? { label: 'Low Stock', cls: 'bg-amber-100 text-amber-700' }
                  : { label: 'In Stock', cls: 'bg-green-100 text-green-700' }
              return (
                <tr
                  key={product.id}
                  className={`border-b last:border-0 ${
                    out
                      ? 'bg-gray-200 opacity-60 grayscale'
                      : low
                        ? 'bg-red-600'
                        : 'hover:bg-gray-50'
                  }`}
                >
                  <td className={`px-4 py-3 font-medium ${out ? 'text-gray-500' : low ? 'text-white' : 'text-gray-900'}`}>
                    {product.name}
                  </td>
                  <td className={`px-4 py-3 ${out ? 'text-gray-400' : low ? 'text-red-100' : 'text-gray-600'}`}>
                    {product.categoryName ?? '-'}
                  </td>
                  <td className={`px-4 py-3 ${out ? 'text-gray-500' : low ? 'text-white' : 'text-gray-600'}`}>
                    ${product.price.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${out ? 'text-gray-500' : low ? 'text-white' : 'text-gray-900'}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className={`px-4 py-3 ${out ? 'text-gray-500' : low ? 'text-red-100' : 'text-gray-500'}`}>
                    {product.minStock}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${status.cls}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => {
                        setTarget({ id: product.id, name: product.name, current: product.stock, mode: 'in' })
                        setQty('')
                        setError('')
                      }}
                      className={`${
                        out
                          ? 'text-gray-500 hover:text-gray-700'
                          : low
                            ? 'text-white hover:text-red-100'
                            : 'text-green-600 hover:text-green-700'
                      } mr-3`}
                      title="Add stock (stock in)"
                    >
                      + Add Stock
                    </button>
                    <button
                      onClick={() => {
                        setTarget({ id: product.id, name: product.name, current: product.stock, mode: 'out' })
                        setQty('')
                        setError('')
                      }}
                      className={
                        out
                          ? 'text-gray-500 hover:text-gray-700'
                          : low
                            ? 'text-white hover:text-red-100'
                            : 'text-red-500 hover:text-red-600'
                      }
                      title="Remove stock (stock out)"
                    >
                      − Stock Out
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered && filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">No products found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {target && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {target.mode === 'in' ? '+ Add Stock' : '− Stock Out'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {target.name} · Current stock: <span className="font-medium text-gray-900">{target.current}</span>
            </p>

            {error && <div className="mb-4 px-4 py-2 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>}

            <input
              type="number"
              min="1"
              autoFocus
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Quantity"
              className="w-full px-3 py-2 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setTarget(null)}
                className="px-4 py-2 rounded-md text-gray-600 border hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitAdjust}
                disabled={loading}
                className="px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}