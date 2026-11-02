import { Link } from 'react-router-dom'
import { Package } from 'lucide-react'
import { useMyOrders } from '../hooks/useOrders'
import OrderStatusBadge from '../components/OrderStatusBadge'
import { formatDate, formatINR } from '../lib/format'

export default function Orders() {
  const { data: orders, isLoading } = useMyOrders()

  if (isLoading) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center">Loading orders...</div>
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Package className="h-20 w-20 mx-auto mb-4 text-gray-300" />
        <h1 className="text-2xl font-bold text-gray-900 mb-4">No orders yet</h1>
        <p className="text-gray-600 mb-8">Place your first order to see it here.</p>
        <Link
          to="/products"
          className="px-6 py-3 rounded-md text-white bg-green-600 hover:bg-green-700 font-medium"
        >
          Start Shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <span className="font-semibold text-gray-900">{order.orderNumber}</span>
                <span className="text-sm text-gray-500 ml-3">{formatDate(order.createdAt)}</span>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>

            <p className="text-sm text-gray-600 mb-3">
              {order.items.map((i) => `${i.productName} × ${i.quantity}`).join(', ')}
            </p>

            <div className="flex items-center justify-between">
              <span className="font-bold text-green-700">{formatINR(order.total)}</span>
              <Link
                to={`/orders/${order.id}`}
                className="text-green-600 hover:text-green-700 font-medium text-sm"
              >
                View Details →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
