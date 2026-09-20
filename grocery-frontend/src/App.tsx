import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
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
import AdminLayout from './pages/admin/AdminLayout'
import AdminIndex from './pages/admin/AdminIndex'
import ProductManagement from './pages/admin/ProductManagement'
import SupplierManagement from './pages/admin/SupplierManagement'
import AdminOrders from './pages/admin/AdminOrders'
import StaffManagement from './pages/admin/StaffManagement'
import Billing from './pages/admin/Billing'
import Stock from './pages/admin/Stock'
import CategoryManagement from './pages/admin/CategoryManagement'
import Restock from './pages/admin/Restock'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
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
            <Route index element={<AdminIndex />} />
            <Route path="products" element={<ProductManagement />} />
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
              path="staff"
              element={
                <AdminOnly>
                  <StaffManagement />
                </AdminOnly>
              }
            />
          </Route>
        </Routes>
      </main>
    </div>
  )
}
