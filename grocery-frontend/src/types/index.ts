export interface User {
  id: number
  username: string
  email: string
  fullName: string
  phone: string | null
  role: 'STAFF' | 'ADMIN'
  createdAt: string
}

export interface AuthResponse {
  token: string
  tokenType: string
  user: User
}

export interface LoginRequest {
  usernameOrEmail: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  fullName: string
  phone?: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ForgotPasswordResponse {
  message: string
  /** Present only when mail is simulated (dev mode) — the link to open to set a new password. */
  resetLink?: string
}

export interface ResetPasswordRequest {
  token: string
  password: string
}

export interface CreateUserRequest {
  username: string
  email: string
  password: string
  fullName: string
  phone?: string
  role: 'STAFF' | 'ADMIN'
}

export interface AdminResetPasswordRequest {
  newPassword?: string
}

export interface AdminResetPasswordResponse {
  message: string
  temporaryPassword?: string
}

export interface BillItem {
  productId: number
  productName: string
  quantity: number
  price: number
  subtotal: number
}

export interface Bill {
  id: number
  billNumber: string
  staffName: string
  customerName: string | null
  total: number
  paymentMethod: string | null
  createdAt: string
  items: BillItem[]
}

export interface CreateBillRequest {
  customerName?: string
  paymentMethod?: string
  items: { productId: number; quantity: number }[]
}

export interface DailySales {
  date: string
  label: string
  total: number
  billCount: number
}

export interface SalesReport {
  daily: DailySales[]
  totalSales: number
  billCount: number
  itemsSold: number
}

export interface Category {
  id: number
  name: string
  description: string | null
  imageUrl: string | null
  /** Number of products mapped to this category. */
  productCount?: number
}

export interface UploadResponse {
  url: string
}

export interface Supplier {
  id: number
  name: string
  company: string | null
  phone: string
  email: string | null
  address: string | null
}

export interface Product {
  id: number
  name: string
  code: string | null
  description: string | null
  price: number
  stock: number
  minStock: number
  imageUrl: string | null
  categoryId: number | null
  categoryName: string | null
  supplierId: number | null
  supplierName: string | null
  lowStock: boolean
  /** Total units sold so far (POS bills + orders, cancelled excluded). */
  soldCount?: number
  /** Quantity from the most recent restock (manual or auto), if it happened recently. */
  restockQty?: number
  /** True when the recent restock was automatic (sale-time top-up), false for manual. */
  restockAuto?: boolean
  /** When the recent restock happened (ISO datetime). */
  restockAt?: string
}

export interface RestockHistoryEvent {
  id: number
  productId: number
  productName: string | null
  productCode: string | null
  quantity: number
  eventType: 'AUTO' | 'MANUAL'
  deliveryMethod: 'SUPPLIER' | 'COURIER' | 'SELF_PICKUP' | 'OTHER' | null
  receivedAt: string | null
  costPerUnit: number | null
  notes: string | null
  createdBy: string | null
  createdAt: string
}

export interface CartItem {
  id: number
  productId: number
  productName: string
  imageUrl: string | null
  price: number
  quantity: number
  subtotal: number
  stock: number
}

export interface CartResponse {
  items: CartItem[]
  totalItems: number
  subtotal: number
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'

export interface OrderItem {
  productId: number
  productName: string
  quantity: number
  price: number
  subtotal: number
}

export interface Order {
  id: number
  orderNumber: string
  userId: number
  customerName: string
  total: number
  status: OrderStatus
  deliveryAddress: string
  paymentMethod: string
  createdAt: string
  items: OrderItem[]
}
