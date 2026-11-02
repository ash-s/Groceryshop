import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Gift, History, Megaphone, Pencil, Trash2 } from 'lucide-react'
import { customerApi } from '../../api/customers'
import { useCustomers, useAdjustPoints, useCustomerPointHistory, useSaveCustomer } from '../../hooks/useCustomers'
import { getErrorMessage } from '../../api/auth'
import { formatINR } from '../../lib/format'
import Pagination from '../../components/Pagination'
import { usePagination } from '../../hooks/usePagination'
import type { Customer } from '../../types'

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500'

export default function CustomerManagement() {
  const queryClient = useQueryClient()
  const { data: customers, isLoading } = useCustomers()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Customer | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [pointsFor, setPointsFor] = useState<Customer | null>(null)
  const [historyFor, setHistoryFor] = useState<Customer | null>(null)
  const [showBroadcast, setShowBroadcast] = useState(false)

  const filtered = customers?.filter((c) =>
    (c.name + ' ' + (c.phone ?? '')).toLowerCase().includes(search.toLowerCase())
  )
  const pager = usePagination(filtered ?? [], 10, search)

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['customers'] })

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this customer?')) return
    try {
      await customerApi.delete(id)
      refresh()
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  if (isLoading) return <div className="text-center py-16 text-gray-500">Loading…</div>

  return (
    <div>
      <div className="mb-6 flex items-center justify-end gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => setShowBroadcast(true)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 px-4 py-2 rounded-md border border-green-600 text-green-700 hover:bg-green-50 font-medium sm:flex-none"
          >
            <Megaphone className="h-4 w-4" />
            Send Offer
          </button>
          <button
            onClick={() => {
              setEditing(null)
              setShowForm(true)
            }}
            className="flex-1 whitespace-nowrap px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 font-medium sm:flex-none"
          >
            + Add Customer
          </button>
        </div>
      </div>

      <input
        type="text"
        placeholder="Search by name or phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm px-3 py-2 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
      />

      <div className="bg-white rounded-xl shadow-sm overflow-hidden table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Phone</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Points</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Value</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pager.pageItems.map((customer) => (
              <tr key={customer.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{customer.name}</td>
                <td className="px-4 py-3 text-gray-600">{customer.phone ?? '-'}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{customer.points}</td>
                <td className="px-4 py-3 text-right text-green-700">{formatINR(customer.pointsValue)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => setPointsFor(customer)}
                      title="Adjust points"
                      className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700"
                    >
                      <Gift className="h-4 w-4" />
                      Points
                    </button>
                    <button
                      onClick={() => setHistoryFor(customer)}
                      title="Point history"
                      className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700"
                    >
                      <History className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditing(customer)
                        setShowForm(true)
                      }}
                      title="Edit"
                      className="text-green-600 hover:text-green-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(customer.id)}
                      title="Delete"
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  No customers yet. Add one, or link a customer while billing.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination {...pager} itemLabel="customers" />
      </div>

      {showForm && (
        <CustomerForm
          customer={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            refresh()
          }}
        />
      )}

      {pointsFor && (
        <PointsModal customer={pointsFor} onClose={() => setPointsFor(null)} />
      )}

      {historyFor && (
        <HistoryModal customer={historyFor} onClose={() => setHistoryFor(null)} />
      )}

      {showBroadcast && <BroadcastModal onClose={() => setShowBroadcast(false)} />}
    </div>
  )
}

function CustomerForm({ customer, onClose, onSaved }: {
  customer: Customer | null
  onClose: () => void
  onSaved: () => void
}) {
  const save = useSaveCustomer()
  const [form, setForm] = useState({
    name: customer?.name ?? '',
    phone: customer?.phone ?? '',
    notes: customer?.notes ?? '',
  })
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await save.mutateAsync({ id: customer?.id, data: form })
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {customer ? 'Edit Customer' : 'Add Customer'}
        </h3>
        {error && <div className="mb-4 px-4 py-2 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone (WhatsApp)</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-600 border hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={save.isPending} className="px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50">
              {save.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PointsModal({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const adjust = useAdjustPoints()
  const [points, setPoints] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const submit = async (delta: number) => {
    setError('')
    try {
      await adjust.mutateAsync({ id: customer.id, points: delta, reason: reason || undefined })
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const value = Math.trunc(Number(points) || 0)
    if (value === 0) {
      setError('Enter a non-zero number of points')
      return
    }
    await submit(value)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Loyalty Points</h3>
        <p className="text-sm text-gray-500 mb-4">
          {customer.name} · current balance <b className="text-gray-800">{customer.points}</b> points
        </p>
        {error && <div className="mb-4 px-4 py-2 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Points to add (+)</label>
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="e.g. 10"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. festival bonus" className={inputClass} />
          </div>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-md text-gray-600 border hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="button"
              disabled={adjust.isPending}
              onClick={() => submit(-(Math.trunc(Number(points) || 0)))}
              className="px-3 py-2 rounded-md border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Remove
            </button>
            <button type="submit" disabled={adjust.isPending} className="px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50">
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function HistoryModal({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const { data: entries, isLoading } = useCustomerPointHistory(customer.id)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Point History</h3>
        <p className="text-sm text-gray-500 mb-4">{customer.name}</p>
        {isLoading ? (
          <p className="py-6 text-center text-gray-500">Loading…</p>
        ) : (
          <div className="max-h-72 divide-y divide-gray-100 overflow-y-auto">
            {entries?.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="text-gray-800">{e.reason}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(e.createdAt).toLocaleString()}
                    {e.billId ? ` · bill #${e.billId}` : ''}
                  </div>
                </div>
                <span className={e.points >= 0 ? 'font-semibold text-green-700' : 'font-semibold text-red-600'}>
                  {e.points >= 0 ? `+${e.points}` : e.points}
                </span>
              </div>
            ))}
            {entries?.length === 0 && <p className="py-6 text-center text-gray-500">No movements yet.</p>}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-gray-600 border hover:bg-gray-50">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function BroadcastModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setResult('')
    setSending(true)
    try {
      const res = await customerApi.broadcast({ message, all: true })
      setResult(`Sent ${res.sent}, skipped ${res.skipped} (no phone), failed ${res.failed}.`)
      setMessage('')
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Send Offer / Price Change</h3>
        <p className="text-sm text-gray-500 mb-4">
          Sends a WhatsApp message to every customer with a phone number.
        </p>
        {error && <div className="mb-4 px-4 py-2 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>}
        {result && <div className="mb-4 px-4 py-2 rounded-md bg-green-50 text-green-700 text-sm">{result}</div>}
        <form onSubmit={handleSend} className="space-y-3">
          <textarea
            required
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Rice ₹10 off per kg this week only!"
            className={inputClass}
          />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-600 border hover:bg-gray-50">
              Close
            </button>
            <button type="submit" disabled={sending} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50">
              <Megaphone className="h-4 w-4" />
              {sending ? 'Sending…' : 'Send to all'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
