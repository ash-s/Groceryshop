import { Link } from 'react-router-dom'
import { CalendarClock } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { restockHistoryApi } from '../api/restockHistory'
import { useAuth } from '../context/AuthContext'

/**
 * In-app alert for pending deliveries (expected delivery date set). Shown to both
 * admin and staff on every admin page; stock is only added once the admin clicks
 * Mark Delivered, so any delivery that's due or overdue gets attention here.
 */
export default function PendingDeliveryBanner() {
  const { isAdmin } = useAuth()
  const { data: pending } = useQuery({
    queryKey: ['pending-restocks'],
    queryFn: restockHistoryApi.getPending,
    refetchInterval: 60_000,
  })

  if (!pending || pending.length === 0) return null

  const overdue = pending.some((e) => {
    if (!e.expectedDelivery) return false
    return Date.now() >= new Date(`${e.expectedDelivery}T00:00:00`).getTime()
  })

  const due = pending.filter((e) => {
    if (!e.expectedDelivery) return false
    return Date.now() >= new Date(`${e.expectedDelivery}T00:00:00`).getTime()
  })

  return (
    <div
      className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
        overdue ? 'border-red-300 bg-red-50 text-red-800' : 'border-amber-300 bg-amber-50 text-amber-900'
      }`}
    >
      <p className="flex items-center gap-2 font-semibold">
        <CalendarClock className="h-4 w-4 shrink-0" />
        {overdue
          ? `${due.length} delivery${due.length === 1 ? '' : 's'} due or overdue — `
          : `${pending.length} expected delivery${pending.length === 1 ? '' : 's'} — `}
        stock is added only after confirmation
      </p>
      <ul className="mt-1 ml-1 list-inside list-disc text-[13px]">
        {pending.slice(0, 4).map((e) => (
          <li key={e.id}>
            {e.productName ?? 'Product'} · +{e.quantity} units · expected{' '}
            {e.expectedDelivery
              ? new Date(`${e.expectedDelivery}T00:00:00`).toLocaleDateString([], {
                  dateStyle: 'medium',
                })
              : 'soon'}
          </li>
        ))}
        {pending.length > 4 && <li>and {pending.length - 4} more…</li>}
      </ul>
      {isAdmin && (
        <Link
          to="/admin/restock"
          className="mt-1 inline-block font-semibold text-green-700 hover:text-green-800"
        >
          Confirm deliveries on the Restock page
        </Link>
      )}
    </div>
  )
}