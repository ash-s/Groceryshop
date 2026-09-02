export interface User {
  id: number
  username: string
  email: string
  fullName: string
  phone: string | null
  role: 'CUSTOMER' | 'ADMIN'
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

export interface Category {
  id: number
  name: string
  description: string | null
  imageUrl: string | null
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
