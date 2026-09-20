import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { History, PackagePlus, RefreshCw, Search, Truck } from 'lucide-react'
import { restockHistoryApi } from '../../api/restockHistory'

const DELIVERY_LABELS: Record<string, string> = {
  SUPPLIER: 'Supplier delivered',
  COURIER: 'Courier',
  SELF_PICKUP: 'Self pickup',
  OTHER: 'Other',
}

const formatDT = (iso: string) =>
  new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

const formatDay = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString([], { dateStyle: 'medium' }) : '—'

export default function RestockHistory() {
  const queryClient = useQueryClient()
  const { data: events, isLoading } = useQuery({
    queryKey: ['restock-history'],
    queryFn: restockHistoryApi.getAll,
  })
  const [filter, setFilter] = useState<'ALL' | 'AUTO' | 'MANUAL'>('ALL')
  const [search, setSearch] = useState('')

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['restock-history'] })

  const filtered = useMemo(() => {
    let list = events ?? []
    if (filter !== 'ALL') list = list.filter((e) => e.eventType === filter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (e) =>
          (e.productName ?? '').toLowerCase().includes(q) ||
          (e.productCode ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [events, filter, search])

  const totals = useMemo(() => {
    const list = events ?? []
    return {
      total: list.reduce((s, e) => s + e.quantity, 0),
      auto: list.filter((e) => e.eventType === 'AUTO').reduce((s, e) => s + e.quantity, 0),
      manual: list.filter((e) => e.eventType === 'MANUAL').reduce((s, e) => s + e.quantity, 0),
      count: list.length,
    }
  }, [events])

  if (isLoading) return <div className="text-center py-16">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Restock &amp; Purchase History</h2>
        <button
          onClick={refresh}
          title="Refresh history"
          className="p-2 rounded-md border border-gray-300 text-gray-500 hover:text-green-700 hover:border-green-600"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl bg-white shadow-sm p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <PackagePlus className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Units added</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totals.total}</p>
        </div>
        <div className="rounded-xl bg-white shadow-sm p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <History className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Auto-restocked</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totals.auto}</p>
        </div>
        <div className="rounded-xl bg-white shadow-sm p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Truck className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Manual / received</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totals.manual}</p>
        </div>
        <div className="rounded-xl bg-white shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <History className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Events</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totals.count}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name or code…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="flex rounded-full border border-gray-300 overflow-hidden">
          {(['ALL', 'AUTO', 'MANUAL'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-xs font-medium transition ${
                filter === f
                  ? f === 'AUTO'
                    ? 'bg-green-600 text-white'
                    : f === 'MANUAL'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f === 'ALL' ? 'All' : f === 'AUTO' ? 'Auto-restock' : 'Manual'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center py-16 text-gray-500">
          No restock events yet. Sell an item to its minimum for an auto-restock, or restock
          manually from the Restock tab.
        </p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Date &amp; time</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Product</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Qty</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Delivery</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Received on</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Cost / unit</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Notes</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">By</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatDT(e.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{e.productName ?? '-'}</span>
                    {e.productCode && (
                      <span className="ml-1 font-mono text-[11px] text-gray-400">{e.productCode}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-bold ${
                        e.eventType === 'AUTO' ? 'text-green-700' : 'text-blue-700'
                      }`}
                    >
                      +{e.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        e.eventType === 'AUTO'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {e.eventType === 'AUTO' ? 'Auto-restock' : 'Manual'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {e.eventType === 'AUTO' ? (
                      <span className="text-gray-400">Returned from sale</span>
                    ) : (
                      (e.deliveryMethod && DELIVERY_LABELS[e.deliveryMethod]) ?? '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDay(e.receivedAt)}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {e.costPerUnit != null ? `$${e.costPerUnit.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-[220px] truncate" title={e.notes ?? ''}>
                    {e.notes ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{e.createdBy ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-3 text-xs text-gray-400">
            Auto-restock events are logged when a sale drops an item to its minimum (quantity =
            units sold, stock returned to pre-sale level). Manual events record deliveries you
            receive: delivery method, received date, cost and notes.
          </p>
        </div>
      )}
    </div>
  )
}