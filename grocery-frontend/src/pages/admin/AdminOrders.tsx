import { useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, CheckCircle2, PackageCheck, RefreshCw, Truck } from 'lucide-react'
import { formatINR } from '../../lib/format'
import { restockHistoryApi } from '../../api/restockHistory'
import { getErrorMessage } from '../../api/auth'
import Pagination from '../../components/Pagination'
import ScanInput from '../../components/ScanInput'
import { usePagination } from '../../hooks/usePagination'
import type { RestockHistoryEvent } from '../../types'

/**
 * Delivery Orders — tracks restock deliveries instead of customer web orders.
 * Pending deliveries show here first; stock is only added once someone clicks
 * Mark Delivered (staff and admins can both confirm).
 */
const DELIVERY_LABELS: Record<string, string> = {
  SUPPLIER: 'Supplier delivered',
  COURIER: 'Courier',
  SELF_PICKUP: 'Self pickup',
  OTHER: 'Other',
}

const deliveryLabel = (method: string | null) =>
  method ? DELIVERY_LABELS[method] ?? method : 'Delivery'

const formatDT = (iso: string) =>
  new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

const formatDay = (iso: string | null) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString([], { dateStyle: 'medium' })
    : '—'

export default function AdminOrders() {
  const queryClient = useQueryClient()
  const { data: events, isLoading } = useQuery({
    queryKey: ['restock-history'],
    queryFn: restockHistoryApi.getAll,
  })
  const [deliveringId, setDeliveringId] = useState<number | null>(null)
  const [scanMsg, setScanMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const scanRef = useRef<HTMLInputElement>(null)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['restock-history'] })
    queryClient.invalidateQueries({ queryKey: ['pending-restocks'] })
    queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  const isDue = (e: RestockHistoryEvent) => {
    if (!e.expectedDelivery) return false
    return Date.now() >= new Date(`${e.expectedDelivery}T00:00:00`).getTime()
  }

  const pending = useMemo(() => (events ?? []).filter((e) => e.status === 'PENDING'), [events])
  const history = useMemo(() => (events ?? []).filter((e) => e.status === 'DELIVERED'), [events])

  const historyPager = usePagination(history, 10)

  const stats = useMemo(
    () => ({
      pendingCount: pending.length,
      pendingUnits: pending.reduce((s, e) => s + e.quantity, 0),
      dueCount: pending.filter(isDue).length,
      deliveredCount: history.length,
      receivedUnits: history.reduce((s, e) => s + e.quantity, 0),
    }),
    [pending, history]
  )

  const handleMarkDelivered = async (event: RestockHistoryEvent): Promise<boolean> => {
    const today = new Date().toISOString().slice(0, 10)
    const received =
      window.prompt(
        `Received date for ${event.productName ?? 'product'} (${event.quantity} units)?\nLeave blank for today (${today}).`,
        today
      ) ?? ''
    if (received === '') return false
    setDeliveringId(event.id)
    try {
      await restockHistoryApi.deliver(event.id, received || undefined)
      refresh()
      return true
    } catch (err) {
      alert(getErrorMessage(err))
      return false
    } finally {
      setDeliveringId(null)
    }
  }

  // Scan-first receive: a barcode gun types the code + Enter, we match it against
  // pending deliveries and confirm the arriving stock.
  const handleScanCode = async (code: string) => {
    const matches = pending.filter(
      (e) => e.productCode && e.productCode.trim().toLowerCase() === code.toLowerCase()
    )
    if (matches.length === 0) {
      setScanMsg({ ok: false, text: `No pending delivery matches code "${code}".` })
      scanRef.current?.focus()
      return
    }
    if (matches.length > 1) {
      setScanMsg({
        ok: false,
        text: `${matches.length} pending deliveries match this code — confirm them from the list below.`,
      })
      scanRef.current?.focus()
      return
    }
    setScanMsg({
      ok: true,
      text: `Matched: ${matches[0].productName ?? 'product'} (+${matches[0].quantity} units) — confirming…`,
    })
    const ok = await handleMarkDelivered(matches[0])
    setScanMsg(
      ok
        ? { ok: true, text: 'Delivery confirmed — stock added to inventory.' }
        : { ok: false, text: 'Delivery not confirmed.' }
    )
    scanRef.current?.focus()
  }

  if (isLoading) return <div className="text-center py-16">Loading...</div>

  return (
    <div>
      <div className="mb-4 flex items-center justify-end gap-3">
        <button
          onClick={refresh}
          title="Refresh deliveries"
          className="shrink-0 p-2 rounded-md border border-gray-300 text-gray-500 hover:text-green-700 hover:border-green-600"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl bg-white shadow-sm p-4">
          <div className="flex items-center gap-2 text-amber-600 mb-1">
            <CalendarClock className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pending</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.pendingCount}{' '}
            <span className="text-sm font-normal text-gray-500">({stats.pendingUnits} units)</span>
          </p>
        </div>
        <div className="rounded-xl bg-white shadow-sm p-4">
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <Truck className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Due / overdue</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.dueCount}</p>
        </div>
        <div className="rounded-xl bg-white shadow-sm p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <PackageCheck className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Units received</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.receivedUnits}</p>
        </div>
        <div className="rounded-xl bg-white shadow-sm p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Delivered orders</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.deliveredCount}</p>
        </div>
      </div>

      {/* Pending deliveries */}
      <div className="mb-6">
        {pending.length > 0 && (
          <div className="mb-3">
            <ScanInput
              inputRef={scanRef}
              onScan={(code) => void handleScanCode(code)}
              placeholder="Scan product code to confirm its delivery — press Enter…"
            />
            {scanMsg && (
              <p className={`mt-2 text-sm ${scanMsg.ok ? 'text-green-700' : 'text-amber-700'}`}>
                {scanMsg.text}
              </p>
            )}
          </div>
        )}
        <h3 className="text-sm font-bold text-gray-800 mb-3">Pending deliveries</h3>
        {pending.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
            No pending deliveries.
          </p>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
            {pending.map((event) => {
              const due = isDue(event)
              return (
                <div
                  key={event.id}
                  className={`flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border p-2.5 ${
                    due ? 'border-red-300 bg-red-50' : 'border-amber-200 bg-white'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {event.productName ?? 'Product'}
                      <span className="ml-2 font-normal text-gray-500">+{event.quantity} units</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Expected {formatDay(event.expectedDelivery)} · {deliveryLabel(event.deliveryMethod)} ·
                      ordered by {event.createdBy ?? '—'}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      due ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {due ? 'Due / overdue' : 'Upcoming'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleMarkDelivered(event)}
                    disabled={deliveringId === event.id}
                    className="shrink-0 inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    {deliveringId === event.id ? 'Adding…' : 'Mark Delivered'}
                  </button>
                </div>
              )
            })}
            <p className="pt-1 text-[11px] text-amber-800">
              Stock is added only when a delivery is confirmed as received.
            </p>
          </div>
        )}
      </div>

      {/* Received deliveries */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-800 mb-3">Received deliveries</h3>
        {history.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
            Nothing received yet.
          </p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Received</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Product</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Qty</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Delivery</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Cost / unit</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Notes</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">By</th>
                </tr>
              </thead>
              <tbody>
                {historyPager.pageItems.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {formatDT(e.deliveredAt ?? e.createdAt)}
                    </td>
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
                      {e.eventType === 'AUTO'
                        ? 'Returned from sale'
                        : deliveryLabel(e.deliveryMethod)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {e.costPerUnit != null ? formatINR(e.costPerUnit) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate" title={e.notes ?? ''}>
                      {e.notes ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{e.createdBy ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination {...historyPager} itemLabel="deliveries" />
          </div>
        )}
      </div>
    </div>
  )
}
