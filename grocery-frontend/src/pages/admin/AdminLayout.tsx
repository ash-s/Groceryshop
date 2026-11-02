import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import PendingDeliveryBanner from '../../components/PendingDeliveryBanner'

type SubTab = { to: string; label: string }

type Group = {
  label: string
  /** Where the top-level tab links to. */
  to: string
  /** Path prefixes that belong to this group. */
  matches: string[]
  /** Match the path exactly instead of by prefix (used for the dashboard). */
  exact?: boolean
  /** Inner tabs shown when the group is active. */
  subs?: SubTab[]
}

/**
 * Admin navigation, grouped so the top bar stays short. Related pages live
 * behind one tab with inner tabs: Products (products/categories/suppliers/import),
 * Stock (stock/restock/history) and Barcode (catalog/online search).
 */
const ADMIN_GROUPS: Group[] = [
  { label: 'Dashboard', to: '/admin', matches: ['/admin'], exact: true },
  {
    label: 'Products',
    to: '/admin/products',
    matches: ['/admin/products', '/admin/categories', '/admin/suppliers', '/admin/import'],
    subs: [
      { to: '/admin/products', label: 'Products' },
      { to: '/admin/categories', label: 'Categories' },
      { to: '/admin/suppliers', label: 'Suppliers' },
      { to: '/admin/import', label: 'Bulk Import' },
    ],
  },
  {
    label: 'Stock',
    to: '/admin/stock',
    matches: ['/admin/stock', '/admin/restock', '/admin/restock-history'],
    subs: [
      { to: '/admin/stock', label: 'Stock' },
      { to: '/admin/restock', label: 'Restock' },
      { to: '/admin/restock-history', label: 'Restock History' },
    ],
  },
  {
    label: 'Barcode',
    to: '/admin/catalog',
    matches: ['/admin/catalog', '/admin/barcode-tools'],
    subs: [
      { to: '/admin/catalog', label: 'Catalog' },
      { to: '/admin/barcode-tools', label: 'Tools' },
    ],
  },
  { label: 'Deliveries', to: '/admin/orders', matches: ['/admin/orders'] },
  { label: 'Customers', to: '/admin/customers', matches: ['/admin/customers'] },
  { label: 'Cash', to: '/admin/cash', matches: ['/admin/cash'] },
  { label: 'Staff', to: '/admin/staff', matches: ['/admin/staff'] },
  { label: 'Settings', to: '/admin/settings', matches: ['/admin/settings'] },
]

// Staff use the POS (Billing) and confirm restock deliveries.
const STAFF_TABS = [
  { to: '/admin/billing', label: 'Billing', end: true },
  { to: '/admin/orders', label: 'Deliveries', end: false },
]

function isUnder(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(prefix + '/')
}

export default function AdminLayout() {
  const location = useLocation()
  const { isAdmin } = useAuth()
  const path = location.pathname

  // Billing is staff-only: bounce admins who open the POS route back to the dashboard.
  if (isAdmin && path.startsWith('/admin/billing')) {
    return <Navigate to="/admin" replace />
  }

  const activeGroup = ADMIN_GROUPS.find((group) =>
    group.exact ? path === group.to : group.matches.some((m) => isUnder(path, m))
  )

  const pageTitle = !isAdmin
    ? path.startsWith('/admin/orders')
      ? 'Delivery Orders'
      : 'Billing'
    : activeGroup?.label === 'Dashboard'
      ? 'Admin Dashboard'
      : activeGroup?.label ?? 'Admin Dashboard'

  /** Renders staff tabs flat; groups get a secondary row of pill sub-tabs. */
  const Nav = isAdmin
    ? ADMIN_GROUPS.map((group) => {
        const active = activeGroup?.label === group.label
        return (
          <Link
            key={group.label}
            to={group.to}
            className={`px-4 py-2 -mb-px border-b-2 font-medium text-sm whitespace-nowrap ${
              active
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-600 hover:text-green-700'
            }`}
          >
            {group.label}
          </Link>
        )
      })
    : STAFF_TABS.map((tab) => {
        const active = tab.end ? path === tab.to : path.startsWith(tab.to)
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
      })

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
      <h1 className="mb-3 text-xl font-bold text-gray-900 sm:mb-6 sm:text-2xl">{pageTitle}</h1>

      <div className="flex flex-row gap-1 mb-0 border-b overflow-x-auto">{Nav}</div>

      {isAdmin && activeGroup?.subs ? (
        <div className="flex flex-wrap gap-2 mt-3 mb-4 sm:mt-4 sm:mb-6">
          {activeGroup.subs.map((sub) => {
            const active = isUnder(path, sub.to)
            return (
              <Link
                key={sub.to}
                to={sub.to}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                  active
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-green-300 hover:text-green-700'
                }`}
              >
                {sub.label}
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="mb-4 sm:mb-6" />
      )}

      <PendingDeliveryBanner />

      <Outlet />
    </div>
  )
}
