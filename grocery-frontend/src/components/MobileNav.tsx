import { NavLink, useLocation } from 'react-router-dom'
import { Home, LayoutDashboard, LogIn, Package, ReceiptIndianRupee } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const HIDDEN_PATHS = [
  '/admin/billing', // billing has its own sticky action bar
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
]

/**
 * Fixed bottom bar for phones so Home / Products / Billing (or Admin) are
 * always one tap away — the desktop navbar hides itself below `md`.
 */
export default function MobileNav() {
  const { isAuthenticated, isAdmin } = useAuth()
  const { pathname } = useLocation()

  if (HIDDEN_PATHS.some((p) => pathname === p)) return null

  const items = [
    { to: '/', label: 'Home', Icon: Home, end: true },
    { to: '/products', label: 'Products', Icon: Package, end: false },
    !isAuthenticated
      ? { to: '/login', label: 'Login', Icon: LogIn, end: false }
      : isAdmin
        ? { to: '/admin', label: 'Admin', Icon: LayoutDashboard, end: true }
        : {
            to: '/admin/billing',
            label: 'Billing',
            Icon: ReceiptIndianRupee,
            end: true,
          },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur pb-safe md:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch">
        {items.map(({ to, label, Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition ${
                  isActive ? 'text-green-700' : 'text-gray-500'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`h-[22px] w-[22px] ${isActive ? 'text-green-700' : 'text-gray-500'}`}
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
