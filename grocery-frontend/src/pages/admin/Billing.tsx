import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { CheckCircle2, Minus, Plus, Search, X } from 'lucide-react'
import { useProducts, useCategories } from '../../hooks/useCatalog'
import { useBills, useCreateBill } from '../../hooks/useBilling'
import { getErrorMessage } from '../../api/auth'
import type { Bill, Product } from '../../types'

interface DraftLine {
  productId: number
  name: string
  price: number
  quantity: number
  stock: number
  code?: string | null
}

const PAYMENT_METHODS = ['CASH', 'CARD', 'UPI', 'OTHER']

export default function Billing() {
  const { data: products, isLoading } = useProducts()
  const { data: categories } = useCategories()
  const { data: bills } = useBills()
  const createBill = useCreateBill()

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [lines, setLines] = useState<DraftLine[]>([])
  const [error, setError] = useState('')
  const [lastBill, setLastBill] = useState<Bill | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const term = search.trim().toLowerCase()

  // Suggestions for the type-to-add box — exact code match first, then name matches.
  const suggestions = useMemo(() => {
    if (!products || !term) return []
    const exactCode = products.filter(
      (p) => p.code && p.code.toLowerCase() === term
    )
    const byName = products.filter((p) => p.name.toLowerCase().includes(term))
    const byCode = products.filter(
      (p) => p.code && p.code.toLowerCase().includes(term)
    )
    const seen = new Set<number>()
    const ordered = [...exactCode, ...byName, ...byCode]
    return ordered
      .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
      .slice(0, 6)
  }, [products, term])

  // Tile grid — filtered by search term (name OR code) and category.
  const filteredProducts = useMemo(() => {
    if (!products) return []
    return products.filter((p) => {
      if (categoryId !== null && p.categoryId !== categoryId) return false
      if (term) {
        const byName = p.name.toLowerCase().includes(term)
        const byCode = p.code && p.code.toLowerCase().includes(term)
        if (!byName && !byCode) return false
      }
      return true
    })
  }, [products, term, categoryId])

  const itemCount = lines.reduce((n, l) => n + l.quantity, 0)
  const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0)

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
    setPaymentMethod('CASH')
    setError('')
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (suggestions[0]) quickAdd(suggestions[0])
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
        customerName: customerName.trim() || undefined,
        paymentMethod,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      })
      setLastBill(bill)
      clearBill()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  if (isLoading) return <div className="text-center py-16 text-gray-500">Loading…</div>

  return (
    <div>
      {/* Type-to-add / scan bar */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={searchRef}
          type="text"
          placeholder="Type product name or scan code, then press Enter…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-green-600"
        />
        {suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            {suggestions.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => quickAdd(p)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-green-50"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {p.code && (
                    <span className="font-mono text-[10px] text-gray-400">{p.code}</span>
                  )}
                  <span className="truncate text-sm font-medium text-gray-800">{p.name}</span>
                </div>
                <span className="whitespace-nowrap text-sm font-bold text-green-700">
                  ${p.price.toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main area: small product grid (1/3) + big bill panel (2/3) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Products */}
        <div className="lg:col-span-1">
          <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setCategoryId(null)}
              className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition ${
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
                className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  categoryId === c.id
                    ? 'bg-green-600 text-white'
                    : 'border border-gray-300 bg-white text-gray-600 hover:border-green-500'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
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
                  className={`rounded-lg border p-2 text-left transition ${
                    out
                      ? 'cursor-not-allowed border-red-700 bg-red-600 opacity-70'
                      : low
                        ? 'border-red-700 bg-red-600 hover:bg-red-500 hover:shadow active:scale-[0.98]'
                        : 'border-gray-200 bg-white hover:border-green-500 hover:shadow active:scale-[0.98]'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-1">
                    <span className={`truncate text-xs font-semibold ${out || low ? 'text-white' : 'text-gray-900'}`}>
                      {product.name}
                    </span>
                    {product.code && (
                      <span className={`shrink-0 font-mono text-[9px] ${out || low ? 'text-red-100' : 'text-gray-400'}`}>
                        {product.code}
                      </span>
                    )}
                  </div>
                  <div className={`mt-0.5 text-sm font-bold ${out || low ? 'text-white' : 'text-green-700'}`}>
                    ${product.price.toFixed(2)}
                  </div>
                  <div className="mt-0.5">
                    {product.stock <= 0 ? (
                      <span className="text-[10px] font-medium text-red-100">Out of stock</span>
                    ) : product.lowStock ? (
                      <span className="text-[10px] font-bold text-white">
                        Left {product.stock} · Sold {product.soldCount ?? 0} · LOW!
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400">
                        Left {product.stock} · Sold {product.soldCount ?? 0}
                      </span>
                    )}
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

        {/* Bill panel — bigger */}
        <form
          onSubmit={handleGenerate}
          className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Current Bill</h3>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
              {itemCount} item{itemCount === 1 ? '' : 's'}
            </span>
          </div>

          {error && (
            <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          {lines.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">
              Scan a code or type a product name above, then Enter.
            </p>
          ) : (
            <div className="mb-4 max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {lines.map((line) => (
                <div
                  key={line.productId}
                  className="flex items-center gap-2 rounded-lg border border-gray-100 px-2 py-1.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-gray-900">{line.name}</div>
                    <div className="text-xs text-gray-500">${line.price.toFixed(2)} each</div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => changeQty(line.productId, -1)}
                      className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-9 text-center text-lg font-bold text-gray-900">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => changeQty(line.productId, 1)}
                      disabled={line.quantity >= line.stock}
                      className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="w-20 text-right text-base font-bold text-gray-900">
                    ${(line.price * line.quantity).toFixed(2)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(line.productId)}
                    className="flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Customer name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Payment</label>
              <div className="grid grid-cols-4 gap-1.5">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`rounded-md py-2 text-sm font-semibold transition ${
                      paymentMethod === m
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between rounded-xl bg-green-50 px-5 py-3">
            <span className="text-lg font-semibold text-green-800">Total</span>
            <span className="text-3xl font-bold text-green-700">${total.toFixed(2)}</span>
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
              className="flex-1 rounded-lg bg-green-600 py-2.5 text-base font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {createBill.isPending ? 'Generating…' : 'Generate Bill'}
            </button>
          </div>
        </form>
      </div>

      {/* Recent bills */}
      <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b px-4 py-3">
          <h3 className="font-semibold text-gray-800">Recent Bills</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-2.5 text-left font-semibold text-gray-700">Bill No.</th>
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
                <td className="px-4 py-2.5 text-gray-600">{bill.customerName || 'Walk-in'}</td>
                <td className="px-4 py-2.5 text-gray-600">{bill.staffName}</td>
                <td className="px-4 py-2.5 text-gray-600">
                  {bill.items.reduce((n, i) => n + i.quantity, 0)}
                </td>
                <td className="px-4 py-2.5 text-gray-600">{bill.paymentMethod || '-'}</td>
                <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                  ${bill.total.toFixed(2)}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-500">
                  {bill.createdAt ? new Date(bill.createdAt).toLocaleTimeString() : '-'}
                </td>
              </tr>
            ))}
            {bills && bills.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
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
            <h3 className="mb-1 text-center text-lg font-bold text-gray-900">Bill Generated</h3>
            <p className="mb-4 text-center text-sm text-gray-500">{lastBill.billNumber}</p>

            <div className="mb-4 divide-y divide-gray-100 rounded-lg border border-gray-200">
              <div className="max-h-40 overflow-y-auto px-4 py-2">
                {lastBill.items.map((item) => (
                  <div key={item.productId} className="flex justify-between py-0.5 text-sm">
                    <span className="text-gray-700">
                      {item.productName} × {item.quantity}
                    </span>
                    <span className="text-gray-600">${item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between px-4 py-2 text-sm">
                <span className="text-gray-500">Payment</span>
                <span className="font-medium text-gray-700">{lastBill.paymentMethod || '-'}</span>
              </div>
              <div className="flex justify-between px-4 py-2">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-lg font-bold text-green-700">${lastBill.total.toFixed(2)}</span>
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
    </div>
  )
}