import { Link, Outlet, useLocation } from 'react-router-dom'

export default function AdminLayout() {
  const location = useLocation()

  const tabs = [
    { to: '/admin', label: 'Dashboard', end: true },
    { to: '/admin/products', label: 'Products' },
    { to: '/admin/suppliers', label: 'Suppliers' },
    { to: '/admin/orders', label: 'Orders' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

      <div className="flex flex-row gap-4 mb-6 border-b">
        {tabs.map((tab) => {
          const active = tab.end ? location.pathname === tab.to : location.pathname.startsWith(tab.to)
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`px-4 py-2 -mb-px border-b-2 font-medium text-sm ${
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

      <Outlet />
    </div>
  )
}
