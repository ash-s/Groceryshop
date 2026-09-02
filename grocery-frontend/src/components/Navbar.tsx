import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../hooks/useCart'

export default function Navbar() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth()
  const { data: cart } = useCart()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition ${
      isActive ? 'text-green-700 bg-green-50' : 'text-gray-700 hover:text-green-700'
    }`

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🛒</span>
            <span className="text-xl font-bold text-green-700">GroceryShop</span>
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            <NavLink to="/" className={navLinkClass} end>Home</NavLink>
            <NavLink to="/products" className={navLinkClass}>Products</NavLink>
            {isAuthenticated && (
              <NavLink to="/orders" className={navLinkClass}>Orders</NavLink>
            )}
            {isAdmin && (
              <NavLink to="/admin" className={navLinkClass}>Admin</NavLink>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to={isAuthenticated ? '/cart' : '/login'}
              className="relative flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-green-700"
            >
              <span className="text-xl">🛒</span>
              {cart && cart.totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cart.totalItems}
                </span>
              )}
            </Link>

            {isAuthenticated ? (
              <>
                <span className="hidden sm:inline text-sm text-gray-600">
                  {user?.fullName}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-red-600"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-md text-sm font-medium text-green-700 border border-green-700 hover:bg-green-50"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
