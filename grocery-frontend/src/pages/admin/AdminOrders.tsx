import { useAllOrders, useUpdateOrderStatus } from '../../hooks/useOrders'
import OrderStatusBadge from '../../components/OrderStatusBadge'
import { formatDateTime } from '../../lib/format'
import type { OrderStatus } from '../../types'

const statusOptions: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
]

export default function AdminOrders() {
  const { data: orders, isLoading } = useAllOrders()
  const updateStatus = useUpdateOrderStatus()

  if (isLoading) return <div className="text-center py-16">Loading...</div>

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">All Orders</h2>

      <div className="space-y-4">
        {orders?.map((order) => (
          <div key={order.id} className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <span className="font-semibold text-gray-900">{order.orderNumber}</span>
                <span className="text-sm text-gray-500 ml-3">{formatDateTime(order.createdAt)}</span>
              </div>
              <div className="flex items-center gap-3">
                <OrderStatusBadge status={order.status} />
                <select
                  value={order.status}
                  onChange={(e) =>
                    updateStatus.mutate({ id: order.id, status: e.target.value })
                  }
                  className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-1">
              <span className="font-medium text-gray-800">Customer:</span> {order.customerName}
            </p>
            <p className="text-sm text-gray-600 mb-3">
              {order.items.map((i) => `${i.productName} × ${i.quantity}`).join(', ')}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{order.paymentMethod.replace(/_/g, ' ')}</span>
              <span className="font-bold text-green-700">${order.total.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
