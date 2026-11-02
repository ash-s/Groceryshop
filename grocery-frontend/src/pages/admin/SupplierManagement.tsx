import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Eye, Pencil, Plus, Trash2, X } from 'lucide-react'
import { supplierApi } from '../../api/catalog'
import { useSuppliers, useSupplierProducts, useSupplierPurchases } from '../../hooks/useCatalog'
import { getErrorMessage } from '../../api/auth'
import { formatINR } from '../../lib/format'
import Pagination from '../../components/Pagination'
import { usePagination } from '../../hooks/usePagination'
import type { Supplier, RestockHistoryEvent } from '../../types'

export default function SupplierManagement() {
  const queryClient = useQueryClient()
  const { data: suppliers, isLoading } = useSuppliers()
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [viewing, setViewing] = useState<Supplier | null>(null)
  const [search, setSearch] = useState('')

  const filtered = suppliers?.filter((s) =>
    (s.name + ' ' + (s.company ?? '') + ' ' + s.phone)
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const pager = usePagination(filtered ?? [], 10, search)

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['suppliers'] })

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this supplier?')) return
    try {
      await supplierApi.delete(id)
      refresh()
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  if (isLoading) return <div className="text-center py-16">Loading...</div>

  return (
    <div>
      <div className="mb-6 flex items-center justify-end">
        <button
          onClick={() => {
            setEditing(null)
            setShowForm(true)
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700"
        >
          <Plus className="h-4 w-4" />
          Add Supplier
        </button>
      </div>

      <input
        type="text"
        placeholder="Search suppliers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm px-3 py-2 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
      />

      <div className="bg-white rounded-xl shadow-sm overflow-hidden table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Company</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Phone (WhatsApp)</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Email</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pager.pageItems.map((supplier) => (
              <tr key={supplier.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{supplier.name}</td>
                <td className="px-4 py-3 text-gray-600">{supplier.company ?? '-'}</td>
                <td className="px-4 py-3 text-gray-600">{supplier.phone}</td>
                <td className="px-4 py-3 text-gray-600">{supplier.email ?? '-'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setViewing(supplier)}
                    className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 mr-3"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </button>
                  <button
                    onClick={() => {
                      setEditing(supplier)
                      setShowForm(true)
                    }}
                    className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 mr-3"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(supplier.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination {...pager} itemLabel="suppliers" />
      </div>

      {viewing && <SupplierDetail supplier={viewing} onClose={() => setViewing(null)} />}

      {showForm && (
        <SupplierForm
          supplier={editing}
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

function SupplierForm({ supplier, onClose, onSaved }: {
  supplier: Supplier | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: supplier?.name ?? '',
    company: supplier?.company ?? '',
    phone: supplier?.phone ?? '',
    email: supplier?.email ?? '',
    address: supplier?.address ?? '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (supplier) {
        await supplierApi.update(supplier.id, form)
      } else {
        await supplierApi.create(form)
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
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {supplier ? 'Edit Supplier' : 'Add Supplier'}
        </h3>

        {error && <div className="mb-4 px-4 py-2 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone (WhatsApp) *</label>
            <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className={inputClass} />
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

function SupplierDetail({ supplier, onClose }: { supplier: Supplier; onClose: () => void }) {
  const { data: products, isLoading: loadingProducts } = useSupplierProducts(supplier.id)
  const { data: purchases, isLoading: loadingPurchases } = useSupplierPurchases(supplier.id)

  const delivered = (purchases ?? []).filter((event) => event.status === 'DELIVERED')
  const pending = (purchases ?? []).filter((event) => event.status === 'PENDING')
  const totalReceived = delivered.reduce(
    (sum, event) => sum + Number(event.costPerUnit ?? 0) * event.quantity,
    0
  )

  const dateOf = (event: RestockHistoryEvent) => {
    const raw = event.receivedAt ?? event.expectedDelivery ?? event.createdAt
    if (!raw) return '—'
    const parsed = new Date(raw)
    return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleDateString()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{supplier.name}</h3>
            <p className="text-sm text-gray-500">
              {[supplier.company, supplier.phone].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 space-y-6">
          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-900">Products supplied</h4>
              <span className="text-xs text-gray-500">
                {products?.length ?? 0} product{products?.length === 1 ? '' : 's'}
              </span>
            </div>
            {loadingProducts ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : products && products.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-gray-200 table-scroll">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-3 py-2 font-semibold text-gray-700">Product</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-700">Code</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-700">Price</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-700">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="border-b last:border-0">
                        <td className="px-3 py-2 font-medium text-gray-900">{product.name}</td>
                        <td className="px-3 py-2 text-gray-500">
                          {product.code ?? product.barcode ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900">
                          {formatINR(product.price)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span
                            className={
                              product.stock <= 0 ? 'font-semibold text-red-600' : 'text-gray-700'
                            }
                          >
                            {product.stock}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No products are mapped to this supplier yet. Set the supplier while adding or
                editing a product.
              </p>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-900">Purchase history</h4>
              <span className="text-xs text-gray-500">
                {purchases?.length ?? 0} record{purchases?.length === 1 ? '' : 's'} ·{' '}
                {formatINR(totalReceived)} received
                {pending.length > 0 ? ` · ${pending.length} pending` : ''}
              </span>
            </div>
            {loadingPurchases ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : purchases && purchases.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-gray-200 table-scroll">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-3 py-2 font-semibold text-gray-700">Date</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-700">Product</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-700">Qty</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-700">
                        Cost / unit
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((event) => (
                      <tr key={event.id} className="border-b last:border-0">
                        <td className="px-3 py-2 text-gray-600">{dateOf(event)}</td>
                        <td className="px-3 py-2 font-medium text-gray-900">
                          {event.productName ?? `Product #${event.productId}`}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700">{event.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-700">
                          {event.costPerUnit === null ? '—' : formatINR(event.costPerUnit)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              event.status === 'DELIVERED'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {event.status === 'DELIVERED' ? 'Received' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No purchases recorded for this supplier yet.
              </p>
            )}
          </section>
        </div>

        <div className="flex justify-end border-t px-6 py-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-gray-600 border hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
