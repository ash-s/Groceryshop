import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import PendingDeliveryBanner from '../../components/PendingDeliveryBanner'

export default function AdminLayout() {
  const location = useLocation()
  const { isAdmin } = useAuth()

  type Tab = { to: string; label: string; end?: boolean }

  const adminTabs: Tab[] = [
    { to: '/admin', label: 'Dashboard', end: true },
    { to: '/admin/products', label: 'Products' },
    { to: '/admin/categories', label: 'Categories' },
    { to: '/admin/suppliers', label: 'Suppliers' },
    { to: '/admin/stock', label: 'Stock' },
    { to: '/admin/restock', label: 'Restock' },
    { to: '/admin/restock-history', label: 'Restock History' },
    { to: '/admin/orders', label: 'Orders' },
    { to: '/admin/staff', label: 'Staff' },
  ]

  // Staff only use Billing — no tab bar for them. Admins don't use the POS.
  const tabs = isAdmin ? adminTabs : []

  // Billing is staff-only: bounce admins who open the POS route back to the dashboard.
  if (isAdmin && location.pathname.startsWith('/admin/billing')) {
    return <Navigate to="/admin" replace />
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isAdmin ? 'Admin Dashboard' : 'Billing'}
      </h1>

      {tabs.length > 0 && (
        <div className="flex flex-row gap-4 mb-6 border-b overflow-x-auto">
          {tabs.map((tab) => {
            const active = tab.end ? location.pathname === tab.to : location.pathname.startsWith(tab.to)
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`px-4 py-2 -mb-px border-b-2 font-medium text-sm whitespace-nowrap ${
                  active
                    ? 'border-green-600 text-green-700'
                    : 'border-transparent text-gray-600 hover:text-green-700'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      )}

      <PendingDeliveryBanner />

      <Outlet />
    </div>
  )
}