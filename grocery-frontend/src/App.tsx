import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import MobileNav from './components/MobileNav'
import { ProtectedRoute, AdminRoute, AdminOnly, StaffOnly } from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Scan from './pages/Scan'

// Admin pages are lazy-loaded so the initial bundle stays small.
// The admin section is only opened occasionally; each page loads on demand.
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const AdminIndex = lazy(() => import('./pages/admin/AdminIndex'))
const ProductManagement = lazy(() => import('./pages/admin/ProductManagement'))
const SupplierManagement = lazy(() => import('./pages/admin/SupplierManagement'))
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'))
const StaffManagement = lazy(() => import('./pages/admin/StaffManagement'))
const Billing = lazy(() => import('./pages/admin/Billing'))
const Stock = lazy(() => import('./pages/admin/Stock'))
const CategoryManagement = lazy(() => import('./pages/admin/CategoryManagement'))
const BarcodeCatalog = lazy(() => import('./pages/admin/BarcodeCatalog'))
const BarcodeTools = lazy(() => import('./pages/admin/BarcodeTools'))
const BulkImport = lazy(() => import('./pages/admin/BulkImport'))
const Restock = lazy(() => import('./pages/admin/Restock'))
const RestockHistory = lazy(() => import('./pages/admin/RestockHistory'))
const Settings = lazy(() => import('./pages/admin/Settings'))
const CustomerManagement = lazy(() => import('./pages/admin/CustomerManagement'))
const CashReconciliation = lazy(() => import('./pages/admin/CashReconciliation'))

export default function App() {
  const location = useLocation()
  // The phone scanner is a bare full-screen app of its own: no shop nav.
  const bare = location.pathname === '/scan'

  return (
    <div className="min-h-screen flex flex-col">
      {!bare && <Navbar />}
      <main className={bare ? '' : 'flex-1 pb-16 md:pb-0'}>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/scan" element={<Scan />} />
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:id" element={<ProductDetail />} />

            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <ProtectedRoute>
                  <OrderDetail />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >
              <Route index element={<AdminOnly><AdminIndex /></AdminOnly>} />
              <Route path="products" element={<ProductManagement />} />
              <Route
                path="catalog"
                element={
                  <AdminOnly>
                    <BarcodeCatalog />
                  </AdminOnly>
                }
              />
              <Route
                path="barcode-tools"
                element={
                  <AdminOnly>
                    <BarcodeTools />
                  </AdminOnly>
                }
              />
              <Route
                path="import"
                element={
                  <AdminOnly>
                    <BulkImport />
                  </AdminOnly>
                }
              />
              <Route
                path="categories"
                element={
                  <AdminOnly>
                    <CategoryManagement />
                  </AdminOnly>
                }
              />
              <Route
                path="suppliers"
                element={
                  <AdminOnly>
                    <SupplierManagement />
                  </AdminOnly>
                }
              />
              <Route
                path="billing"
                element={
                  <StaffOnly>
                    <Billing />
                  </StaffOnly>
                }
              />
              <Route path="stock" element={<Stock />} />
              <Route
                path="restock"
                element={
                  <AdminOnly>
                    <Restock />
                  </AdminOnly>
                }
              />
              <Route path="orders" element={<AdminOrders />} />
              <Route
                path="customers"
                element={
                  <AdminOnly>
                    <CustomerManagement />
                  </AdminOnly>
                }
              />
              <Route
                path="cash"
                element={
                  <AdminOnly>
                    <CashReconciliation />
                  </AdminOnly>
                }
              />
              <Route
                path="restock-history"
                element={
                  <AdminOnly>
                    <RestockHistory />
                  </AdminOnly>
                }
              />
              <Route
                path="staff"
                element={
                  <AdminOnly>
                    <StaffManagement />
                  </AdminOnly>
                }
              />
              <Route
                path="settings"
                element={
                  <AdminOnly>
                    <Settings />
                  </AdminOnly>
                }
              />
            </Route>
          </Routes>
        </Suspense>
      </main>
      {!bare && <MobileNav />}
    </div>
  )
}
