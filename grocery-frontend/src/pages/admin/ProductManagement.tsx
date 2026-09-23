import { useMemo, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FolderOpen, PackagePlus, Pencil, RefreshCw, Search, Trash2 } from 'lucide-react'
import { productApi } from '../../api/catalog'
import { getErrorMessage } from '../../api/auth'
import { useProducts, useCategories, useSuppliers } from '../../hooks/useCatalog'
import ImageUpload from '../../components/ImageUpload'
import RestockModal from '../../components/RestockModal'
import type { Product } from '../../types'

const emptyForm = {
  name: '',
  code: '',
  description: '',
  brand: '',
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
  const [restockTarget, setRestockTarget] = useState<Product | null>(null)
  const [search, setSearch] = useState('')

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['low-stock'] })
  }

  // Client-side search + push fully out-of-stock products to the bottom.
  const filtered = useMemo(() => {
    if (!products) return []
    let list = products
    const term = search.trim().toLowerCase()
    if (term) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.code ?? '').toLowerCase().includes(term) ||
          (p.brand ?? '').toLowerCase().includes(term) ||
          (p.categoryName ?? '').toLowerCase().includes(term) ||
          (p.supplierName ?? '').toLowerCase().includes(term)
      )
    }
    const rank = (p: Product) => (p.stock <= 0 ? 2 : p.lowStock ? 1 : 0)
    return [...list].sort((a, b) => rank(a) - rank(b))
  }, [products, search])

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this product?')) return
    try {
      await productApi.delete(id)
      refresh()
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  // Quick map: change a product's category straight from the table.
  const handleMapCategory = async (product: Product, categoryId: number | null) => {
    try {
      await productApi.update(product.id, {
        name: product.name,
        code: product.code ?? undefined,
        description: product.description ?? undefined,
        brand: product.brand ?? undefined,
        price: product.price,
        stock: product.stock,
        minStock: product.minStock,
        imageUrl: product.imageUrl ?? undefined,
        categoryId,
        supplierId: product.supplierId,
      })
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
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            title="Refresh stock data"
            className="p-2 rounded-md border border-gray-300 text-gray-500 hover:text-green-700 hover:border-green-600"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link
            to="/admin/categories"
            className="inline-flex items-center gap-1 px-4 py-2 rounded-md border border-green-600 text-green-700 hover:bg-green-50 font-medium text-sm"
          >
            <FolderOpen className="h-4 w-4" />
            Manage Categories
          </Link>
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
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, code, brand, category or supplier…"
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Product</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Code</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Brand</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Category</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Supplier</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Price</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Stock</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => {
              const out = product.stock <= 0
              const low = !out && product.lowStock
              const recent =
                !!product.restockAt &&
                Date.now() - Date.parse(product.restockAt) < 5 * 60 * 1000
              const sub = out
                ? 'text-gray-400'
                : low
                  ? 'text-red-100'
                  : recent
                    ? 'text-amber-800'
                    : 'text-gray-500'
              const bodyCol = out
                ? 'text-gray-500'
                : low
                  ? 'text-white'
                  : recent
                    ? 'text-amber-900'
                    : 'text-gray-600'
              return (
                <tr
                  key={product.id}
                  className={`border-b last:border-0 ${
                    out
                      ? 'bg-gray-200 opacity-60 grayscale'
                      : low
                        ? 'bg-red-600'
                        : recent
                          ? 'bg-amber-100'
                          : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-3">
                    <span
                      className={`font-medium ${
                        out ? 'text-gray-500' : low ? 'text-white' : recent ? 'text-amber-900' : 'text-gray-900'
                      }`}
                    >
                      {product.name}
                    </span>
                    {recent && !out && !low && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        <PackagePlus className="h-3 w-3" />
                        {product.restockAuto ? 'Auto-restocked' : 'Restocked'} +{product.restockQty}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-xs ${sub}`}>{product.code ?? '—'}</span>
                  </td>
                  <td className={`px-4 py-3 ${bodyCol}`}>{product.brand ?? '—'}</td>
                <td className="px-4 py-3">
                  <select
                    value={product.categoryId ?? ''}
                    onChange={(e) =>
                      handleMapCategory(product, e.target.value ? Number(e.target.value) : null)
                    }
                    title="Map this product to a category"
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">– Uncategorized –</option>
                    {categories?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={`px-4 py-3 ${bodyCol}`}>{product.supplierName ?? '-'}</td>
                <td className={`px-4 py-3 ${bodyCol}`}>${product.price.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex flex-col gap-0.5">
                    <span className={`text-sm font-bold ${
                      out ? 'text-gray-500' : low ? 'text-white' : recent ? 'text-amber-900' : 'text-gray-900'
                    }`}>
                      {product.stock} left
                    </span>
                    <span className={`text-[11px] ${sub}`}>
                      sold {product.soldCount ?? 0} · min {product.minStock}
                      {recent && !out && !low &&
                        ` · +${product.restockQty} ${product.restockAuto ? 'auto-restocked' : 'restocked'} just now`}
                      {out ? ' · OUT!' : low ? ' · LOW!' : ''}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setRestockTarget(product)}
                    title="Restock"
                    className={`mr-3 ${
                      out
                        ? 'text-gray-500 hover:text-gray-700'
                        : low
                          ? 'text-white hover:text-red-100'
                          : 'text-blue-600 hover:text-blue-700'
                    }`}
                  >
                    <PackagePlus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(product.id)
                      setShowForm(true)
                    }}
                    className={`mr-3 ${
                      out
                        ? 'text-gray-500 hover:text-gray-700'
                        : low
                          ? 'text-white hover:text-red-100'
                          : 'text-green-600 hover:text-green-700'
                    }`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className={
                      out
                        ? 'text-gray-500 hover:text-gray-700'
                        : low
                          ? 'text-white hover:text-red-100'
                          : 'text-red-500 hover:text-red-600'
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="px-4 py-3 text-xs text-gray-400">
          When a sale drops an item to its minimum, the admin + supplier get a WhatsApp alert and,
          with auto-restock ON (see the Restock tab), the sold quantity is added back automatically.
          Items topped up this way show an amber highlight with the exact quantity for a few minutes.
          Fully out of stock items are greyed out, cannot be billed and are listed last. Restock
          manually with the Restock icon, or schedule a delivery with an expected date.
        </p>
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

      {restockTarget && (
        <RestockModal
          product={restockTarget}
          onClose={() => setRestockTarget(null)}
          onRestocked={() => {
            setRestockTarget(null)
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
          code: existing.code ?? '',
          description: existing.description ?? '',
          brand: existing.brand ?? '',
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
      code: form.code.trim() || undefined,
      description: form.description || undefined,
      brand: form.brand.trim() || undefined,
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code / Barcode <span className="font-normal text-gray-400">(optional — for scan &amp; quick add)</span>
            </label>
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="e.g. Amul, Britannia" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
              <input required type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
            <input required type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock</label>
              <input type="number" min="0" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={inputClass}>
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
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
          <ImageUpload value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} />
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
