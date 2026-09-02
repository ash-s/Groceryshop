import { Link } from 'react-router-dom'
import { useProducts, useLowStockProducts } from '../../hooks/useCatalog'
import { useAllOrders } from '../../hooks/useOrders'

export default function Dashboard() {
  const { data: products } = useProducts()
  const { data: lowStock } = useLowStockProducts()
  const { data: orders } = useAllOrders()

  const pendingCount = orders?.filter((o) => o.status === 'PENDING').length ?? 0

  const stats = [
    { label: 'Total Products', value: products?.length ?? 0, icon: '📦', to: '/admin/products' },
    { label: 'Low Stock', value: lowStock?.length ?? 0, icon: '⚠️', to: '/admin/products', alert: (lowStock?.length ?? 0) > 0 },
    { label: 'Pending Orders', value: pendingCount, icon: '🚚', to: '/admin/orders' },
  ]

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            to={stat.to}
            className={`bg-white rounded-xl shadow-sm p-6 ${stat.alert ? 'border-2 border-red-400' : ''}`}
          >
            <div className="text-3xl mb-2">{stat.icon}</div>
            <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </Link>
        ))}
      </div>

      {/* Low stock alerts */}
      {lowStock && lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
          <h2 className="font-bold text-red-700 text-lg mb-4">
            ⚠️ Low Stock Alerts ({lowStock.length})
          </h2>
          <div className="space-y-3">
            {lowStock.map((product) => (
              <div key={product.id} className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium text-gray-900">{product.name}</span>
                  <span className="text-sm text-red-600 ml-2">
                    Stock: {product.stock} / Min: {product.minStock}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Supplier: {product.supplierName ?? 'Unknown'}
                  {product.supplierId && (
                    <Link
                      to={`/admin/products?edit=${product.id}`}
                      className="ml-3 text-green-600 hover:text-green-700 font-medium"
                    >
                      Restock
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent orders */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 text-lg">Recent Orders</h2>
          <Link to="/admin/orders" className="text-green-600 hover:text-green-700 font-medium text-sm">
            View all →
          </Link>
        </div>
        {orders && orders.length > 0 ? (
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <span className="font-medium text-gray-900">{order.orderNumber}</span>
                  <span className="text-sm text-gray-500 ml-2">{order.customerName}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-green-700 mr-3">${order.total.toFixed(2)}</span>
                  <span className="text-gray-500">{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No orders yet.</p>
        )}
      </div>
    </div>
  )
}
