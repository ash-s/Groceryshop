import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { productApi } from '../../api/catalog'
import { getErrorMessage } from '../../api/auth'
import { useProducts, useCategories, useSuppliers } from '../../hooks/useCatalog'

const emptyForm = {
  name: '',
  description: '',
  price: '',
  stock: '',
  minStock: '10',
  imageUrl: '',
  categoryId: '',
  supplierId: '',
}

export default function ProductManagement() {
  const queryClient = useQueryClient()
  const { data: products, isLoading } = useProducts()
  const { data: categories } = useCategories()
  const { data: suppliers } = useSuppliers()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['low-stock'] })
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this product?')) return
    try {
      await productApi.delete(id)
      refresh()
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  if (isLoading) return <div className="text-center py-16">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Products</h2>
        <button
          onClick={() => {
            setEditingId(null)
            setShowForm(true)
          }}
          className="px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 font-medium"
        >
          + Add Product
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Product</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Category</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Supplier</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Price</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Stock</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products?.map((product) => (
              <tr key={product.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900">{product.name}</span>
                  {product.lowStock && <span className="ml-2 text-red-500">⚠️</span>}
                </td>
                <td className="px-4 py-3 text-gray-600">{product.categoryName ?? '-'}</td>
                <td className="px-4 py-3 text-gray-600">{product.supplierName ?? '-'}</td>
                <td className="px-4 py-3 text-gray-600">${product.price.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={product.lowStock ? 'text-red-600 font-medium' : 'text-gray-600'}>
                    {product.stock}
                  </span>
                  {product.lowStock && (
                    <span className="text-xs text-red-500"> (min {product.minStock})</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => {
                      setEditingId(product.id)
                      setShowForm(true)
                    }}
                    className="text-green-600 hover:text-green-700 mr-3"
                  >
                    ✏️
                  </button>
                  <button onClick={() => handleDelete(product.id)} className="text-red-500 hover:text-red-600">
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <ProductForm
          productId={editingId}
          categories={categories ?? []}
          suppliers={suppliers ?? []}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            refresh()
          }}
        />
      )}
    </div>
  )
}

function ProductForm({
  productId,
  categories,
  suppliers,
  onClose,
  onSaved,
}: {
  productId: number | null
  categories: { id: number; name: string }[]
  suppliers: { id: number; name: string }[]
  onClose: () => void
  onSaved: () => void
}) {
  const { data: product } = useProducts()
  const existing = product?.find((p) => p.id === productId)

  const [form, setForm] = useState(() =>
    existing
      ? {
          name: existing.name,
          description: existing.description ?? '',
          price: String(existing.price),
          stock: String(existing.stock),
          minStock: String(existing.minStock),
          imageUrl: existing.imageUrl ?? '',
          categoryId: existing.categoryId ? String(existing.categoryId) : '',
          supplierId: existing.supplierId ? String(existing.supplierId) : '',
        }
      : emptyForm
  )
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isEdit = productId !== null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const payload = {
      name: form.name,
      description: form.description || undefined,
      price: Number(form.price),
      stock: Number(form.stock),
      minStock: Number(form.minStock || 10),
      imageUrl: form.imageUrl || undefined,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      supplierId: form.supplierId ? Number(form.supplierId) : null,
    }
    try {
      if (isEdit && productId) {
        await productApi.update(productId, payload)
      } else {
        await productApi.create(payload)
      }
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
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {isEdit ? 'Edit Product' : 'Add Product'}
        </h3>

        {error && <div className="mb-4 px-4 py-2 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
              <input required type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
              <input required type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock</label>
              <input type="number" min="0" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
              <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={inputClass}>
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className={inputClass}>
                <option value="">None</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-600 border hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
