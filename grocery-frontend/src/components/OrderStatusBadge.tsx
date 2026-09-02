import type { OrderStatus } from '../types'

const statusStyles: Record<OrderStatus, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'bg-purple-100 text-purple-800' },
  DELIVERED: { label: 'Delivered', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
}

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = statusStyles[status] ?? statusStyles.PENDING
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  )
}
