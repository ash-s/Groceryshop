import { useParams, Link, Navigate } from 'react-router-dom'
import { useMyOrders } from '../hooks/useOrders'
import OrderStatusBadge from '../components/OrderStatusBadge'
import { formatDateTime } from '../lib/format'

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const orderId = Number(id)
  const { data: orders, isLoading } = useMyOrders()

  if (isLoading) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center">Loading order...</div>
  }

  const order = orders?.find((o) => o.id === orderId)

  if (!order) {
    return <Navigate to="/orders" replace />
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/orders" className="text-sm text-gray-500 hover:text-green-600 mb-6 inline-block">
        ← Back to Orders
      </Link>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-gray-900">{order.orderNumber}</h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="text-sm text-gray-500">{formatDateTime(order.createdAt)}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <h2 className="font-bold text-gray-900 text-lg mb-4">Order Items</h2>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.productId} className="flex items-center justify-between">
              <div>
                <span className="font-medium text-gray-900">{item.productName}</span>
                <span className="text-sm text-gray-500"> × {item.quantity}</span>
              </div>
              <span className="font-medium">${item.subtotal.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="border-t mt-4 pt-4 flex justify-between">
          <span className="font-bold text-gray-900">Total</span>
          <span className="font-bold text-green-700">${order.total.toFixed(2)}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="font-bold text-gray-900 text-lg mb-3">Delivery Details</h2>
        <p className="text-gray-600 mb-2">{order.deliveryAddress}</p>
        <p className="text-sm text-gray-500">Payment: {order.paymentMethod.replace(/_/g, ' ')}</p>
      </div>
    </div>
  )
}
