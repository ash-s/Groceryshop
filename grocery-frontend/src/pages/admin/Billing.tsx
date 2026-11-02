import { lazy, Suspense, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { NavLink } from 'react-router-dom'
import { Camera, CheckCircle2, Home, Minus, Plus, Search, Smartphone, X } from 'lucide-react'
import { formatINR } from '../../lib/format'
import { useProducts, useCategories } from '../../hooks/useCatalog'
import { useBills, useCreateBill } from '../../hooks/useBilling'
import { useCustomers } from '../../hooks/useCustomers'
import { useQueryClient } from '@tanstack/react-query'
import { getErrorMessage } from '../../api/auth'
import useKeyboardWedge from '../../hooks/useKeyboardWedge'
import PhoneScannerPanel from '../../components/PhoneScannerPanel'
import { useBridgeSession, useBridgeStream } from '../../hooks/useBridge'
import type { BridgeCart } from '../../api/bridge'
import type { Bill, Customer, Product } from '../../types'

// The barcode decoder is heavy, so it is only downloaded when the camera is opened.
const CameraScanner = lazy(() => import('../../components/CameraScanner'))

interface DraftLine {
  productId: number
  name: string
  price: number
  quantity: number
  stock: number
  code?: string | null
}

const PAYMENT_METHODS = ['CASH', 'CARD', 'UPI', 'OTHER']

/** Rupee denominations the customer may hand over (₹2000 is not counted). */
const DENOMS = [500, 200, 100, 50, 20, 10, 5, 2, 1]

export default function Billing() {
  const { data: products, isLoading } = useProducts()
  const { data: categories } = useCategories()
  const { data: bills } = useBills()
  const { data: customers } = useCustomers()
  const createBill = useCreateBill()

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [customerPhone, setCustomerPhone] = useState('')
  const [redeemPoints, setRedeemPoints] = useState(true)
  const [customerFocus, setCustomerFocus] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [lines, setLines] = useState<DraftLine[]>([])
  const [error, setError] = useState('')
  const [lastBill, setLastBill] = useState<Bill | null>(null)
  const [discount, setDiscount] = useState('')
  const [tendered, setTendered] = useState('')
  const [notes, setNotes] = useState<Record<number, number>>({})
  const [scannerOpen, setScannerOpen] = useState(false)
  const [phoneOpen, setPhoneOpen] = useState(false)
  const [phoneMode, setPhoneMode] = useState('BILLING')
  const [phoneCart, setPhoneCart] = useState<BridgeCart | null>(null)
  const [notice, setNotice] = useState('')
  const [phoneBillNotice, setPhoneBillNotice] = useState('')
  const [lastBillOrigin, setLastBillOrigin] = useState<'desk' | 'phone'>('desk')
  const searchRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const { session: bridgeSession } = useBridgeSession(true)

  const selectedCustomer = useMemo(
    () => customers?.find((c) => c.id === customerId) ?? null,
    [customers, customerId]
  )

  // Customer suggestions while typing a name (hidden once one is picked).
  const customerSuggestions = useMemo(() => {
    const t = customerName.trim().toLowerCase()
    if (!t || customerId !== null) return []
    return (customers ?? [])
      .filter((c) => c.name.toLowerCase().includes(t) || (c.phone ?? '').includes(t))
      .slice(0, 5)
  }, [customers, customerName, customerId])

  const notesTotal = DENOMS.reduce((sum, v) => sum + v * (notes[v] || 0), 0)
  const cashNotesText = DENOMS.filter((v) => notes[v])
    .map((v) => `${v}x${notes[v]}`)
    .join(', ')

  const term = search.trim().toLowerCase()

  // Suggestions for the type-to-add box — exact code match first, then name matches.
  // Fully out of stock items are not offered.
  const suggestions = useMemo(() => {
    if (!products || !term) return []
    const exactCode = products.filter(
      (p) =>
        (p.code && p.code.toLowerCase() === term) ||
        (p.barcode && p.barcode.toLowerCase() === term)
    )
    const byName = products.filter((p) => p.name.toLowerCase().includes(term))
    const byCode = products.filter(
      (p) =>
        (p.code && p.code.toLowerCase().includes(term)) ||
        (p.barcode && p.barcode.toLowerCase().includes(term))
    )
    const seen = new Set<number>()
    const ordered = [...exactCode, ...byName, ...byCode]
    return ordered
      .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
      .filter((p) => p.stock > 0) // don't offer out-of-stock items
      .slice(0, 6)
  }, [products, term])

  // Tile grid — filtered by search term (name OR code) and category.
  // Out of stock items sink to the bottom and can't be picked.
  const filteredProducts = useMemo(() => {
    if (!products) return []
    const rank = (p: Product) => (p.stock <= 0 ? 2 : p.lowStock ? 1 : 0)
    return products
      .filter((p) => {
        if (categoryId !== null && p.categoryId !== categoryId) return false
        if (term) {
          const byName = p.name.toLowerCase().includes(term)
          const byCode =
            (p.code && p.code.toLowerCase().includes(term)) ||
            (p.barcode && p.barcode.toLowerCase().includes(term))
          if (!byName && !byCode) return false
        }
        return true
      })
      .sort((a, b) => rank(a) - rank(b))
  }, [products, term, categoryId])

  const itemCount = lines.reduce((n, l) => n + l.quantity, 0)
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0)
  // Which shop this bill covers (mixed when grocery and iMobile items are both in the cart).
  const cartShops = new Set(
    lines.map((line) => {
      const product = products?.find((p) => p.id === line.productId)
      return product?.shop === 'IMOBILE' ? 'IMOBILE' : 'GROCERY'
    })
  )
  const cartShop = cartShops.size > 1 ? 'MIXED' : cartShops.has('IMOBILE') ? 'IMOBILE' : 'GROCERY'
  const discountValue = Math.max(0, Number(discount) || 0)
  const total = Math.max(0, subtotal - discountValue)
  const tenderedValue = Number(tendered) || 0
  const changeDue = tenderedValue - total

  const addProduct = (product: Product) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) return prev
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l
        )
      }
      if (product.stock <= 0) return prev
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          stock: product.stock,
          code: product.code,
        },
      ]
    })
  }

  // Quick add from the search box — clears the search after adding.
  const quickAdd = (product: Product) => {
    addProduct(product)
    setSearch('')
    searchRef.current?.focus()
  }

  // A code decoded by the camera is matched against the saved barcode first,
  // then the short till code. Nothing is guessed — only an exact match is added.
  const handleScan = (raw: string) => {
    // Clean the scanned text: remove whitespace, newlines, carriage returns
    const code = raw.replace(/[\s\r\n]+/g, '').trim()
    if (!code) return
    const needle = code.toLowerCase()
    const product = (products ?? []).find(
      (p) =>
        (p.barcode ?? '').trim().toLowerCase() === needle ||
        (p.code ?? '').trim().toLowerCase() === needle
    )
    if (!product) {
      setError(`No product matches the scanned code "${code}".`)
      return
    }
    if (product.stock <= 0) {
      setError(`Out of stock: ${product.name}. Restock it before billing.`)
      return
    }
    setError('')
    addProduct(product)
    setScannerOpen(false) // Auto-close scanner after successful scan
    searchRef.current?.focus()
  }

  // USB barcode gun: a fast keystroke burst lands here even when the cashier
  // last tapped a tile or a button instead of the search box.
  useKeyboardWedge(handleScan, !scannerOpen && !lastBill)

  // Live link: a barcode read on the phone lands here exactly like the desk camera.
  useBridgeStream(bridgeSession?.id, {
    onScan: (result) => {
      if (!result.ok) {
        setError(result.message ?? 'That code is not in the catalogue.')
        return
      }
      setError('')
      setNotice(`${result.name} · ${formatINR(result.price ?? 0)}`)
      window.setTimeout(() => setNotice(''), 2200)
      // In phone-bill mode the phone owns the bill; do not double count.
      if (result.mode !== 'PHONE_BILL') handleScan(result.code)
    },
    onCart: (cart) => setPhoneCart(cart),
    onState: (state) => {
      setPhoneMode(state.mode)
      if (state.mode === 'PHONE_BILL') {
        setPhoneCart((prev) => prev ?? { total: 0, quantity: 0, lines: [] })
        setError('')
      }
    },
    onBill: (bill) => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['sales-report'] })
      setPhoneBillNotice(`Bill ${bill.billNumber} · ${formatINR(bill.total)}`)
      window.setTimeout(() => setPhoneBillNotice(''), 5000)
      // Show it on the counter screen too, unless the cashier is mid-bill here.
      if (lines.length === 0 && !scannerOpen) {
        setLastBillOrigin('phone')
        setLastBill(bill)
      }
    },
  })

  const changeQty = (productId: number, delta: number) => {
    setLines((prev) =>
      prev
        .map((l) =>
          l.productId === productId
            ? { ...l, quantity: Math.min(l.stock, Math.max(0, l.quantity + delta)) }
            : l
        )
        .filter((l) => l.quantity > 0)
    )
  }

  const removeLine = (productId: number) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId))
  }

  const clearBill = () => {
    setLines([])
    setCustomerName('')
    setCustomerId(null)
    setCustomerPhone('')
    setRedeemPoints(true)
    setPaymentMethod('CASH')
    setDiscount('')
    setTendered('')
    setNotes({})
    setError('')
  }

  const pickCustomer = (c: Customer) => {
    setCustomerId(c.id)
    setCustomerName(c.name)
    setCustomerPhone(c.phone ?? '')
    setCustomerFocus(false)
  }

  // Tap a note the customer handed over; the cash total follows automatically.
  const addNote = (value: number) => {
    const next = { ...notes, [value]: (notes[value] || 0) + 1 }
    setNotes(next)
    setTendered(String(DENOMS.reduce((sum, v) => sum + v * (next[v] || 0), 0)))
  }

  const clearNotes = () => {
    setNotes({})
    setTendered('')
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // Scanning types a whole barcode then Enter. Only add on an exact code /
      // barcode match; never guess from a partial name for barcode-like input.
      const exact = suggestions.find(
        (p) =>
          (p.code && p.code.toLowerCase() === term) ||
          (p.barcode && p.barcode.toLowerCase() === term)
      )
      const barcodeLike = /^[0-9]{8,}$/.test(term)
      const pick = exact ?? (barcodeLike ? undefined : suggestions[0])
      if (pick) quickAdd(pick)
    }
  }

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault()
    if (lines.length === 0) {
      setError('Add at least one product to the bill.')
      return
    }
    setError('')
    try {
      const bill = await createBill.mutateAsync({
        customerId: customerId ?? undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        redeemPoints: customerId !== null ? redeemPoints : undefined,
        paymentMethod,
        discountAmount: discountValue > 0 ? discountValue : undefined,
        cashGiven: tenderedValue > 0 ? tenderedValue : undefined,
        cashNotes: cashNotesText || undefined,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      })
      setLastBillOrigin('desk')
      setLastBill(bill)
      clearBill()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  if (isLoading) return <div className="text-center py-16 text-gray-500">Loading…</div>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sticky header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-3 py-2.5 lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <NavLink to="/" aria-label="Home" className="text-gray-500 active:text-green-700">
              <Home className="h-5 w-5" />
            </NavLink>
            <h1 className="text-base font-semibold text-gray-900">Billing</h1>
          </div>
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
            {itemCount === 0 ? 'Empty' : `${itemCount} item${itemCount === 1 ? '' : 's'}`}
          </span>
        </div>
      </header>

      <div className="space-y-4 pb-24 p-3 lg:p-4 lg:pb-8 max-w-7xl mx-auto">
        {/* Type-to-add / scan bar */}
        <div className="relative mb-2">
          <div className="flex items-stretch gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search or scan…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-base outline-none focus:ring-2 focus:ring-green-600 lg:py-2 lg:pl-10 lg:pr-4 lg:text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              title="Scan with this computer's camera"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-green-600 px-4 py-3 text-base font-semibold text-green-700 bg-green-50 hover:bg-green-100 active:bg-green-200 lg:px-3 lg:py-2 lg:text-sm"
            >
              <Camera className="h-5 w-5" />
              <span>Scan</span>
            </button>
            <button
              type="button"
              onClick={() => setPhoneOpen(true)}
              title="Use the phone as the scanner"
              className={`relative inline-flex shrink-0 items-center gap-2 rounded-lg border px-4 py-3 text-base font-semibold lg:px-3 lg:py-2 lg:text-sm ${
                bridgeSession?.phoneConnected
                  ? 'border-green-600 bg-green-600 text-white hover:bg-green-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Smartphone className="h-5 w-5" />
              <span className="hidden sm:inline">Phone</span>
              {bridgeSession?.phoneConnected && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-white ring-2 ring-green-600" />
              )}
            </button>
          </div>
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg lg:shadow-xl">
              {suggestions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => quickAdd(p)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-green-50 lg:px-3 lg:py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {p.code && (
                      <span className="font-mono text-xs text-gray-400 lg:text-[10px]">{p.code}</span>
                    )}
                    <span className="truncate text-base font-medium text-gray-800 lg:text-sm">{p.name}</span>
                  </div>
                  <span className="whitespace-nowrap text-base font-bold text-green-700 lg:text-sm">
                    {formatINR(p.price)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Feedback from the phone scanner / phone bills */}
        {notice && (
          <div className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center px-3 lg:top-3">
            <span className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
              {notice}
            </span>
          </div>
        )}
        {phoneBillNotice && (
          <div className="pointer-events-none fixed inset-x-0 top-28 z-40 flex justify-center px-3 lg:top-16">
            <span className="rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-lg">
              {phoneBillNotice}
            </span>
          </div>
        )}

        {/* Main area: mobile stacked, desktop side-by-side */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Products - full width on mobile, 1/3 on desktop */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 lg:mx-0 lg:px-0">
              <button
                onClick={() => setCategoryId(null)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  categoryId === null
                    ? 'bg-green-600 text-white'
                    : 'border border-gray-300 bg-white text-gray-600 hover:border-green-500'
                }`}
              >
                All
              </button>
              {categories?.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    categoryId === c.id
                      ? 'bg-green-600 text-white'
                      : 'border border-gray-300 bg-white text-gray-600 hover:border-green-500'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-2">
              {filteredProducts.map((product) => {
                const out = product.stock <= 0
                const low = !out && product.lowStock
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product)}
                    disabled={out}
                    title={out ? 'Out of stock' : `Add ${product.name}`}
                    className={`rounded-xl border p-3 text-left transition min-h-[84px] flex flex-col ${
                      out
                        ? 'cursor-not-allowed border-gray-300 bg-gray-100 opacity-60 grayscale'
                        : low
                          ? 'border-red-700 bg-red-600 hover:bg-red-500 hover:shadow active:scale-[0.98]'
                          : 'border-gray-200 bg-white hover:border-green-500 hover:shadow active:scale-[0.98]'
                    }`}
                  >
                    <span className={`block truncate text-sm font-semibold ${out ? 'text-gray-500' : low ? 'text-white' : 'text-gray-900'}`}>
                      {product.name}
                    </span>
                    <div className="mt-auto flex items-baseline justify-between gap-1 pt-1">
                      <span className={`text-lg font-bold ${out ? 'text-gray-500' : low ? 'text-white' : 'text-green-700'}`}>
                        {formatINR(product.price)}
                      </span>
                      {product.code && (
                        <span className={`shrink-0 font-mono text-xs ${out ? 'text-gray-400' : low ? 'text-red-100' : 'text-gray-400'}`}>
                          {product.code}
                        </span>
                      )}
                    </div>
                    {(product.shop ?? 'GROCERY') === 'IMOBILE' && (
                      <span className={`mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${
                        out
                          ? 'bg-gray-300 text-gray-600'
                          : low
                            ? 'bg-red-800 text-red-50'
                            : 'bg-violet-100 text-violet-700'
                      }`}>
                        iMobile
                      </span>
                    )}
                    <div className="mt-auto flex-1 flex items-end justify-between gap-1">
                      <div>
                        {product.stock <= 0 ? (
                          <span className="text-xs font-medium text-gray-500">Out of stock</span>
                        ) : product.lowStock ? (
                          <span className="text-xs font-bold text-white lg:text-red-600">
                            Left {product.stock} · LOW!
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">
                            Left {product.stock}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
              {filteredProducts.length === 0 && (
                <p className="col-span-full py-8 text-center text-sm text-gray-500">
                  No products found.
                </p>
              )}
            </div>
          </div>

          {/* Bill panel — full width on mobile, 2/3 on desktop */}
          <form
            id="billing-form"
            onSubmit={handleGenerate}
            className="lg:col-span-2 order-1 lg:order-2 rounded-2xl border border-gray-200 bg-white p-3 lg:p-5 shadow-sm min-h-0"
          >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Current Bill</h3>
            <div className="flex items-center gap-2">
              {lines.length > 0 && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    cartShop === 'MIXED'
                      ? 'bg-amber-100 text-amber-800'
                      : cartShop === 'IMOBILE'
                        ? 'bg-violet-100 text-violet-700'
                        : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {cartShop === 'MIXED'
                    ? 'Grocery + iMobile'
                    : cartShop === 'IMOBILE'
                      ? 'iMobile'
                      : 'Grocery'}
                </span>
              )}
              <span className="hidden rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 lg:inline-flex">
                {itemCount} item{itemCount === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          {phoneMode === 'PHONE_BILL' && (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                This bill is being made on the phone. Every scan appears there and is
                mirrored below. Tap <strong>Bill on phone</strong> on the phone to take it back.
              </span>
            </div>
          )}

          {phoneMode === 'PHONE_BILL' ? (
            <PhoneBillMirror cart={phoneCart} />
          ) : lines.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">
              Scan or search above.
            </p>
          ) : (
            <div className="mb-4 max-h-72 space-y-2 overflow-y-auto pr-1">
              {lines.map((line) => (
                <div
                  key={line.productId}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-gray-900">{line.name}</div>
                      <div className="text-xs text-gray-500">{formatINR(line.price)} each</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(line.productId)}
                      aria-label={`Remove ${line.name}`}
                      className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 active:bg-red-100"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => changeQty(line.productId, -1)}
                        aria-label="Decrease quantity"
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 active:bg-gray-100"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-6 text-center text-lg font-bold text-gray-900">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => changeQty(line.productId, 1)}
                        disabled={line.quantity >= line.stock}
                        aria-label="Increase quantity"
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 active:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {formatINR(line.price * line.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Customer</label>
              <div className="relative">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value)
                    if (customerId !== null) setCustomerId(null)
                  }}
                  onFocus={() => setCustomerFocus(true)}
                  onBlur={() => window.setTimeout(() => setCustomerFocus(false), 150)}
                  placeholder="Walk-in / search customer"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-600"
                />
                {customerFocus && customerSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                    {customerSuggestions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => pickCustomer(c)}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-green-50"
                      >
                        <span className="text-sm text-gray-800">{c.name}</span>
                        <span className="text-xs text-gray-500">
                          {c.phone || 'no phone'} · {c.points} pts
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedCustomer && (
                <div className="mt-1 flex items-center gap-3 text-xs text-amber-700">
                  <span>
                    {selectedCustomer.points} pts (≈ {formatINR(selectedCustomer.pointsValue)})
                  </span>
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={redeemPoints}
                      onChange={(e) => setRedeemPoints(e.target.checked)}
                    />
                    Use points
                  </label>
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Phone</label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="WhatsApp number"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-gray-700">Payment</label>
              <div className="grid grid-cols-4 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`rounded-lg py-3 text-sm font-semibold transition min-h-[44px] ${
                      paymentMethod === m
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

          {/* Cash + discount */}
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Discount (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Cash received (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={tendered}
                onChange={(e) => {
                  setTendered(e.target.value)
                  setNotes({})
                }}
                placeholder="0"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
          </div>

          {/* Note chips fill the cash field above */}
          <div className="mb-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700">Notes</span>
              {notesTotal > 0 && (
                <button
                  type="button"
                  onClick={clearNotes}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DENOMS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => addNote(v)}
                  className={`h-9 rounded-lg border px-2.5 text-xs font-semibold transition ${
                    notes[v]
                      ? 'border-green-600 bg-green-600 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  ₹{v}
                  {notes[v] ? `×${notes[v]}` : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3 hidden space-y-1 rounded-xl bg-green-50 px-5 py-3 lg:block">
            {discountValue > 0 && (
              <>
                <div className="flex items-center justify-between text-sm text-green-800">
                  <span>Subtotal</span>
                  <span>{formatINR(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-green-800">
                  <span>Discount</span>
                  <span>− {formatINR(discountValue)}</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-green-800">Total</span>
              <span className="text-3xl font-bold text-green-700">{formatINR(total)}</span>
            </div>
            {tendered !== '' && (
              <div
                className={`flex items-center justify-between border-t border-green-200 pt-1 text-sm font-semibold ${
                  changeDue < 0 ? 'text-red-700' : 'text-green-800'
                }`}
              >
                <span>{changeDue < 0 ? 'Short by' : 'Change to return'}</span>
                <span className="text-lg">{formatINR(Math.abs(changeDue))}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={clearBill}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={createBill.isPending || lines.length === 0}
              className="hidden lg:flex lg:flex-1 items-center justify-center rounded-lg bg-green-600 py-2.5 text-base font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {createBill.isPending ? 'Generating…' : 'Generate Bill'}
            </button>
          </div>
        </form>
      </div>

      {/* Close the grid */}
      </div>

      {/* Mobile sticky bar: total + change to return, then Generate Bill */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white px-3 pb-safe pt-2 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        {lines.length > 0 && (
          <div className="mb-2 rounded-xl bg-gray-50 px-3 py-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-600">
                Total{discountValue > 0 ? ` (− ${formatINR(discountValue)})` : ''}
              </span>
              <span className="text-lg font-bold text-gray-900">{formatINR(total)}</span>
            </div>
            {tendered !== '' && (
              <div
                className={`mt-1.5 flex items-center justify-between border-t border-gray-200 pt-1.5 ${
                  changeDue < 0 ? 'text-red-600' : 'text-green-700'
                }`}
              >
                <span className="text-sm font-semibold">
                  {changeDue < 0 ? 'Short by' : 'Change to give'}
                </span>
                <span className="text-xl font-extrabold">{formatINR(Math.abs(changeDue))}</span>
              </div>
            )}
          </div>
        )}
        <button
          type="submit"
          form="billing-form"
          disabled={createBill.isPending || lines.length === 0}
          className="w-full rounded-xl bg-green-600 py-3.5 text-base font-bold text-white hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:bg-gray-400"
        >
          {createBill.isPending ? 'Generating…' : 'Generate Bill'}
        </button>
      </div>

      {/* Recent bills (desktop only — the phone screen is the POS) */}
      <div className="mt-6 hidden overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm table-scroll table-scroll-wide lg:block">
        <div className="border-b px-4 py-3">
          <h3 className="font-semibold text-gray-800">Recent Bills</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-2.5 text-left font-semibold text-gray-700">Bill No.</th>
              <th className="px-4 py-2.5 text-left font-semibold text-gray-700">Shop</th>
              <th className="px-4 py-2.5 text-left font-semibold text-gray-700">Customer</th>
              <th className="px-4 py-2.5 text-left font-semibold text-gray-700">By</th>
              <th className="px-4 py-2.5 text-left font-semibold text-gray-700">Items</th>
              <th className="px-4 py-2.5 text-left font-semibold text-gray-700">Payment</th>
              <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Total</th>
              <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Time</th>
            </tr>
          </thead>
          <tbody>
            {bills?.slice(0, 10).map((bill) => (
              <tr key={bill.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-900">{bill.billNumber}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      bill.shop === 'IMOBILE'
                        ? 'bg-violet-100 text-violet-700'
                        : bill.shop === 'MIXED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {bill.shop === 'IMOBILE'
                      ? 'iMobile'
                      : bill.shop === 'MIXED'
                        ? 'Grocery + iMobile'
                        : 'Grocery'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-600">{bill.customerName || 'Walk-in'}</td>
                <td className="px-4 py-2.5 text-gray-600">{bill.staffName}</td>
                <td className="px-4 py-2.5 text-gray-600">
                  {bill.items.reduce((n, i) => n + i.quantity, 0)}
                </td>
                <td className="px-4 py-2.5 text-gray-600">{bill.paymentMethod || '-'}</td>
                <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                  {formatINR(bill.total)}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-500">
                  {bill.createdAt ? new Date(bill.createdAt).toLocaleTimeString() : '-'}
                </td>
              </tr>
            ))}
            {bills && bills.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No bills yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Success modal */}
      {lastBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="mb-1 text-center text-lg font-bold text-gray-900">
              {lastBillOrigin === 'phone' ? 'Bill from phone' : 'Bill Generated'}
            </h3>
            <p className="mb-4 text-center text-sm text-gray-500">{lastBill.billNumber}</p>

            <div className="mb-4 divide-y divide-gray-100 rounded-lg border border-gray-200">
              <div className="max-h-40 overflow-y-auto px-4 py-2">
                {lastBill.items.map((item) => (
                  <div key={item.productId} className="flex justify-between py-0.5 text-sm">
                    <span className="text-gray-700">
                      {item.productName} × {item.quantity}
                    </span>
                    <span className="text-gray-600">{formatINR(item.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between px-4 py-2 text-sm">
                <span className="text-gray-500">Payment</span>
                <span className="font-medium text-gray-700">{lastBill.paymentMethod || '-'}</span>
              </div>
              {(lastBill.pointsEarned || lastBill.pointsRedeemed) ? (
                <div className="flex justify-between px-4 py-2 text-sm">
                  <span className="text-gray-500">Loyalty</span>
                  <span className="font-medium text-amber-700">
                    {lastBill.pointsEarned ? `+${lastBill.pointsEarned} earned` : ''}
                    {lastBill.pointsEarned && lastBill.pointsRedeemed ? ' · ' : ''}
                    {lastBill.pointsRedeemed ? `−${lastBill.pointsRedeemed} used` : ''}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between px-4 py-2">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-lg font-bold text-green-700">{formatINR(lastBill.total)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setLastBill(null)}
              className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
            >
              New Sale
            </button>
          </div>
        </div>
      )}

      {scannerOpen && (
        <Suspense fallback={null}>
          <CameraScanner onCode={handleScan} onClose={() => setScannerOpen(false)} />
        </Suspense>
      )}

      {phoneOpen && <PhoneScannerPanel onClose={() => setPhoneOpen(false)} />}
    </div>
  )
}

/** Read-only picture of the bill the phone is building, so the counter never goes blank. */
function PhoneBillMirror({ cart }: { cart: BridgeCart | null }) {
  if (!cart || cart.lines.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center">
        <Smartphone className="mx-auto mb-2 h-5 w-5 text-gray-300" />
        <p className="text-sm text-gray-500">Waiting for the first scan on the phone.</p>
      </div>
    )
  }

  return (
    <div className="mb-4">
      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {cart.lines.map((line) => (
          <div
            key={line.productId}
            className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">{line.name}</p>
              <p className="text-xs text-gray-500">
                {formatINR(line.price)} × {line.quantity}
              </p>
            </div>
            <span className="text-base font-bold text-gray-900">
              {formatINR(line.price * line.quantity)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3">
        <span className="text-sm font-semibold text-amber-800">
          {cart.quantity} item{cart.quantity === 1 ? '' : 's'} on phone
        </span>
        <span className="text-2xl font-extrabold text-amber-900">{formatINR(cart.total)}</span>
      </div>
    </div>
  )
}