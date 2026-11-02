export interface User {
  id: number
  username: string
  email: string
  fullName: string
  phone: string | null
  role: 'STAFF' | 'ADMIN'
  createdAt: string
  /** Fixed monthly salary, editable by the admin. */
  monthlySalary?: number | null
}

/** One staff member's attendance for one day. */
export interface AttendanceRow {
  userId: number
  userName: string
  role: string
  date: string
  status: 'PRESENT' | 'HALF_DAY' | 'LEAVE' | 'ABSENT' | null
  notes?: string | null
}

/** Computed salary for one staff member in one month. */
export interface SalarySummary {
  userId: number
  userName: string
  role: string
  month: string
  monthlySalary: number
  workingDays: number
  presentDays: number
  halfDays: number
  leaveDays: number
  absentDays: number
  computedDeductions: number
  deductions: number
  bonus: number
  netPayable: number
  paid: boolean
  paidAmount?: number | null
  paidOn?: string | null
  notes?: string | null
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
  /** Buying price per unit at the time of sale. */
  costPrice?: number | null
}

export interface Bill {
  id: number
  billNumber: string
  staffName: string
  customerName: string | null
  customerId?: number | null
  customerPhone?: string | null
  total: number
  /** Discount (in rupees) applied to the whole bill. */
  discountAmount?: number | null
  /** Loyalty points spent on this bill. */
  pointsRedeemed?: number | null
  /** Loyalty points earned on this bill. */
  pointsEarned?: number | null
  /** Rupee value of the redeemed points. */
  pointsDiscount?: number | null
  cashGiven?: number | null
  cashNotes?: string | null
  paymentMethod: string | null
  /** GROCERY, IMOBILE, or MIXED when the bill has items from both shops. */
  shop?: string | null
  createdAt: string
  items: BillItem[]
}

export interface CreateBillRequest {
  customerName?: string
  customerId?: number
  customerPhone?: string
  /** When true (default), the customer's loyalty points are applied as a discount. */
  redeemPoints?: boolean
  paymentMethod?: string
  discountAmount?: number
  cashGiven?: number
  cashNotes?: string
  items: { productId: number; quantity: number }[]
}

export interface Customer {
  id: number
  name: string
  phone: string | null
  points: number
  /** Rupee value of the current point balance at the configured rate. */
  pointsValue: number
  notes?: string | null
}

export interface CustomerRequest {
  name: string
  phone?: string | null
  notes?: string | null
}

export interface PointEntry {
  id: number
  points: number
  reason: string
  billId: number | null
  createdAt: string
}

export interface LoyaltySettings {
  enabled: boolean
  /** Points earned per ₹100 spent. */
  pointsPerHundred: number
  /** Rupees off per point when redeemed. */
  pointValue: number
}

export interface CashCountDenomination {
  value: number
  count: number
  amount: number
}

export interface CashCount {
  id: number | null
  date: string
  n500: number
  n200: number
  n100: number
  n50: number
  n20: number
  n10: number
  n5: number
  n2: number
  n1: number
  total: number
  /** Cash expected from bills paid in cash that day. */
  expected: number
  /** total - expected. */
  difference: number
  denominations: CashCountDenomination[]
}

export interface DailySales {
  date: string
  label: string
  total: number
  billCount: number
  /** Profit for the day (selling minus buying, net of discounts). */
  profit?: number
}

export interface SalesReport {
  daily: DailySales[]
  totalSales: number
  billCount: number
  itemsSold: number
  /** Profit over the period (selling minus buying, net of discounts). */
  totalProfit?: number
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
  /** Printed barcode on the packet, matched by the scanner gun/mobile. */
  barcode?: string | null
  description: string | null
  brand: string | null
  /** Rack / shelf location label, e.g. "A2". */
  rack: string | null
  price: number
  /** Buying (cost) price per unit, used for the profit report. */
  costPrice?: number | null
  /** Expiry date of the current stock (ISO date, e.g. 2026-12-31). */
  expiryDate?: string | null
  stock: number
  minStock: number
  imageUrl: string | null
  categoryId: number | null
  categoryName: string | null
  supplierId: number | null
  supplierName: string | null
  /** Which shop the product belongs to: GROCERY or IMOBILE. */
  shop?: string | null
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

export interface BarcodeCatalogEntry {
  id: number
  /** The barcode printed on the actual packet, attached by scanning it once. */
  code: string | null
  name: string
  brand: string | null
  category: string | null
}

/**
 * Result of resolving a scanned barcode: from the built-in catalog, or the
 * online Open Food Facts database as a fallback.
 */
export interface BarcodeLookup {
  source: 'CATALOG' | 'OPENFOODFACTS'
  id: number | null
  code: string
  name: string
  brand: string | null
  category: string | null
  quantity: string | null
  imageUrl: string | null
}

/** A suggested barcode for a product that had none (found on Open Food Facts). */
export interface AutoMatchProposal {
  productId: number
  productName: string
  code: string
  matchedName: string
  matchedBrand: string | null
  quantity: string | null
  imageUrl: string | null
  /** 0-100 confidence that the candidate fits the product name. */
  score: number
}

export interface AutoMatchResponse {
  proposals: AutoMatchProposal[]
  /** Pass as `afterId` on the next call (null when there is nothing left). */
  nextAfterId: number | null
  /** Products still without a barcode after this batch. */
  remaining: number
  /** Products examined in this batch. */
  processed: number
}

export interface AutoMatchApplyResult {
  applied: number
  /** Matches skipped because the product was gone, the code was blank, or it was already used. */
  skipped: number
}

/** One row of a bulk stock import (barcode/code optional). */
export interface BulkImportItem {
  name: string
  code?: string | null
  brand?: string | null
  rack?: string | null
  /** Category name — matched to an existing category or created if allowed. */
  category?: string | null
  price: number
  stock?: number
  minStock?: number
}

export interface BulkImportFailure {
  row: number
  name: string
  reason: string
}

export interface BulkImportResult {
  created: number
  skipped: number
  createdCategories: string[]
  failed: BulkImportFailure[]
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
  /** Expected delivery date for pending purchases (stock not added yet). */
  expectedDelivery: string | null
  /** PENDING (delivery not received, stock NOT added) or DELIVERED (stock added). */
  status: 'PENDING' | 'DELIVERED'
  /** When the admin confirmed the delivery and stock was added. */
  deliveredAt: string | null
  costPerUnit: number | null
  notes: string | null
  /** Supplier this purchase was mapped to, when known. */
  supplierId?: number | null
  supplierName?: string | null
  createdBy: string | null
  createdAt: string
}

export interface StockSettings {
  autoRestockEnabled: boolean
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
