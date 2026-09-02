import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supplierApi } from '../../api/catalog'
import { useSuppliers } from '../../hooks/useCatalog'
import { getErrorMessage } from '../../api/auth'
import type { Supplier } from '../../types'

export default function SupplierManagement() {
  const queryClient = useQueryClient()
  const { data: suppliers, isLoading } = useSuppliers()
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = suppliers?.filter((s) =>
    (s.name + ' ' + (s.company ?? '') + ' ' + s.phone)
      .toLowerCase()
      .includes(search.toLowerCase())
  )

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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Suppliers</h2>
        <button
          onClick={() => {
            setEditing(null)
            setShowForm(true)
          }}
          className="px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 font-medium"
        >
          + Add Supplier
        </button>
      </div>

      <input
        type="text"
        placeholder="Search suppliers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm px-3 py-2 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
      />

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
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
            {filtered?.map((supplier) => (
              <tr key={supplier.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{supplier.name}</td>
                <td className="px-4 py-3 text-gray-600">{supplier.company ?? '-'}</td>
                <td className="px-4 py-3 text-gray-600">{supplier.phone}</td>
                <td className="px-4 py-3 text-gray-600">{supplier.email ?? '-'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => {
                      setEditing(supplier)
                      setShowForm(true)
                    }}
                    className="text-green-600 hover:text-green-700 mr-3"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(supplier.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
