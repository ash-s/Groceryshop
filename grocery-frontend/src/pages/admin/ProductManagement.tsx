import { lazy, useMemo, useState, type FormEvent, type KeyboardEvent, Suspense } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Camera,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react'
import { formatINR } from '../../lib/format'
import { productApi } from '../../api/catalog'
import { getErrorMessage } from '../../api/auth'
import { useProducts, useCategories, useSuppliers } from '../../hooks/useCatalog'
import useKeyboardWedge from '../../hooks/useKeyboardWedge'
import ImageUpload from '../../components/ImageUpload'
import Pagination from '../../components/Pagination'
import RestockModal from '../../components/RestockModal'
import { usePagination } from '../../hooks/usePagination'
import type { Product } from '../../types'

// Lazy load the camera scanner to keep bundle small
const CameraScanner = lazy(() => import('../../components/CameraScanner'))

const emptyForm = {
  name: '',
  code: '',
  barcode: '',
  description: '',
  brand: '',
  rack: '',
  price: '',
  costPrice: '',
  expiryDate: '',
  stock: '',
  minStock: '10',
  imageUrl: '',
  categoryId: '',
  supplierId: '',
  shop: 'GROCERY',
}

export default function ProductManagement() {
  const queryClient = useQueryClient()
  const { data: products, isLoading } = useProducts()
  const { data: categories } = useCategories()
  const { data: suppliers } = useSuppliers()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [restockTarget, setRestockTarget] = useState<Product | null>(null)
  const [search, setSearch] = useState('')
  const [shopFilter, setShopFilter] = useState<'ALL' | 'GROCERY' | 'IMOBILE'>('ALL')
  const [showFilter, setShowFilter] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [scanPrefill, setScanPrefill] = useState<string | null>(null)

  // Scan a barcode from the products page: open the matching product, or start a
  // new product with the scanned barcode already filled in.
  const handleQuickScan = (raw: string) => {
    const code = raw.replace(/[\s\r\n]+/g, '').trim()
    setScanOpen(false)
    if (!code) return
    const needle = code.toLowerCase()
    const match = (products ?? []).find(
      (p) =>
        (p.barcode ?? '').trim().toLowerCase() === needle ||
        (p.code ?? '').trim().toLowerCase() === needle
    )
    if (match) {
      // Known product: open its restock form to top up stock.
      setScanPrefill(null)
      setRestockTarget(match)
      return
    }
    // Unknown barcode: start a new product with the barcode already filled in.
    setScanPrefill(code)
    setEditingId(null)
    setShowForm(true)
  }

  // Enter in the search box = USB barcode gun: an exact code opens that
  // product's restock, an unknown barcode opens Add Product with it filled in.
  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const raw = search.trim()
    if (!raw) return
    const needle = raw.toLowerCase()
    const match = (products ?? []).find(
      (p) =>
        (p.barcode ?? '').trim().toLowerCase() === needle ||
        (p.code ?? '').trim().toLowerCase() === needle
    )
    if (match) {
      setSearch('')
      setScanPrefill(null)
      setRestockTarget(match)
      return
    }
    if (/^\d{4,}$/.test(raw)) handleQuickScan(raw)
  }

  // USB barcode gun: scan from anywhere on the product list — a known code
  // opens Restock, an unknown barcode opens Add Product with it filled in.
  useKeyboardWedge(handleQuickScan, !restockTarget && !showForm && !scanOpen)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['low-stock'] })
  }

  // Client-side search + push fully out-of-stock products to the bottom.
  const filtered = useMemo(() => {
    if (!products) return []
    let list = products
    const term = search.trim().toLowerCase()
    if (term) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.code ?? '').toLowerCase().includes(term) ||
          (p.barcode ?? '').toLowerCase().includes(term) ||
          (p.brand ?? '').toLowerCase().includes(term) ||
          (p.rack ?? '').toLowerCase().includes(term) ||
          (p.categoryName ?? '').toLowerCase().includes(term) ||
          (p.supplierName ?? '').toLowerCase().includes(term)
      )
    }
    if (shopFilter !== 'ALL') {
      list = list.filter((p) => (p.shop ?? 'GROCERY') === shopFilter)
    }
    const rank = (p: Product) => (p.stock <= 0 ? 2 : p.lowStock ? 1 : 0)
    return [...list].sort((a, b) => rank(a) - rank(b))
  }, [products, search, shopFilter])

  const pager = usePagination(filtered, 10, search)

  // Expired items plus anything expiring within the next two months (60 days).
  const expiringSoon = useMemo(() => {
    const now = Date.now()
    return (products ?? [])
      .map((product) => {
        const days = product.expiryDate
          ? Math.ceil((Date.parse(product.expiryDate) - now) / 86400000)
          : null
        return { product, days }
      })
      .filter(
        (row): row is { product: Product; days: number } =>
          row.days !== null && row.days <= 60
      )
      .sort((a, b) => a.days - b.days)
  }, [products])

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this product?')) return
    try {
      await productApi.delete(id)
      refresh()
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  // Quick map: change a product's category straight from the table.
  const handleMapCategory = async (product: Product, categoryId: number | null) => {
    try {
      await productApi.update(product.id, {
        name: product.name,
        code: product.code ?? undefined,
        barcode: product.barcode ?? undefined,
        description: product.description ?? undefined,
        brand: product.brand ?? undefined,
        rack: product.rack ?? undefined,
        price: product.price,
        costPrice: product.costPrice ?? undefined,
        expiryDate: product.expiryDate ?? undefined,
        stock: product.stock,
        minStock: product.minStock,
        imageUrl: product.imageUrl ?? undefined,
        categoryId,
        supplierId: product.supplierId,
        shop: product.shop ?? undefined,
      })
      refresh()
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  if (isLoading) return <div className="text-center py-16">Loading...</div>

  return (
    <div>
      {/* Search + filter (Ajio-style), then icon actions */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search products"
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilter(true)}
          title="Filter"
          className={`flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium ${
            shopFilter !== 'ALL'
              ? 'border-green-600 bg-green-50 text-green-700'
              : 'border-gray-300 text-gray-600'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filter</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setScanPrefill(null)
            setScanOpen(true)
          }}
          title="Scan barcode"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-green-600 text-green-700 active:bg-green-50"
        >
          <Camera className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => {
            setScanPrefill(null)
            setEditingId(null)
            setShowForm(true)
          }}
          title="Add product"
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600 text-white active:bg-green-700"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {expiringSoon.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {expiringSoon.length} product{expiringSoon.length === 1 ? '' : 's'} expired or
                expiring within 2 months
              </p>
              <ul className="mt-1 space-y-0.5">
                {expiringSoon.slice(0, 6).map(({ product, days }) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(product.id)
                        setShowForm(true)
                      }}
                      className="text-left text-xs text-amber-800 hover:underline"
                    >
                      <span className="font-medium">{product.name}</span>
                      <span className="text-amber-700">
                        {' — '}
                        {product.expiryDate}
                        {' · '}
                        {days < 0
                          ? `expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`
                          : days === 0
                            ? 'expires today'
                            : `${days} day${days === 1 ? '' : 's'} left`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {expiringSoon.length > 6 && (
                <p className="mt-1 text-xs text-amber-700">
                  +{expiringSoon.length - 6} more
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter sheet — keeps the list screen as clean as a shopping app */}
      {showFilter && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowFilter(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-md rounded-t-2xl bg-white p-4 pb-safe sm:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Filter</h3>
              <button
                type="button"
                onClick={() => setShowFilter(false)}
                aria-label="Close"
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-1.5 text-xs font-medium text-gray-500">Shop</p>
            <div className="grid grid-cols-3 gap-2">
        {([
          ['ALL', 'All'],
          ['GROCERY', 'Grocery'],
          ['IMOBILE', 'iMobile'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setShopFilter(value)}
            className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              shopFilter === value
                ? 'border border-green-600 bg-green-600 text-white'
                : 'border border-gray-300 text-gray-600 hover:border-green-600 hover:text-green-700'
            }`}
          >
            {label}
          </button>
        ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShopFilter('ALL')}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-600"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setShowFilter(false)}
                className="flex-[2] rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white"
              >
                Show {filtered.length}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden table-scroll table-scroll-wide">
        {/* Phone: one card per product */}
        <div className="space-y-2 p-2 lg:hidden">
          {pager.pageItems.map((product) => {
            const out = product.stock <= 0
            const low = !out && product.lowStock
            const expDays = product.expiryDate
              ? Math.ceil((Date.parse(product.expiryDate) - Date.now()) / 86400000)
              : null
            const recent =
              !!product.restockAt &&
              Date.now() - Date.parse(product.restockAt) < 5 * 60 * 1000
            const muted = out ? 'text-gray-400' : low ? 'text-red-100' : 'text-gray-500'
            const strong = out ? 'text-gray-500' : low ? 'text-white' : 'text-gray-900'
            return (
              <div
                key={product.id}
                className={`rounded-xl border p-3 ${
                  out
                    ? 'border-gray-200 bg-gray-100 opacity-60 grayscale'
                    : low
                      ? 'border-red-600 bg-red-600'
                      : recent
                        ? 'border-amber-300 bg-amber-50'
                        : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-semibold ${strong}`}>{product.name}</p>
                    <p className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs ${muted}`}>
                      <span className="font-mono">#{product.code || '—'}</span>
                      {product.barcode && <span className="font-mono">{product.barcode}</span>}
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          (product.shop ?? 'GROCERY') === 'IMOBILE'
                            ? 'bg-violet-100 text-violet-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {(product.shop ?? 'GROCERY') === 'IMOBILE' ? 'iMobile' : 'Grocery'}
                      </span>
                      {recent && !out && !low && (
                        <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          +{product.restockQty} restocked
                        </span>
                      )}
                    </p>
                    <p className={`mt-1 flex flex-wrap gap-x-3 text-xs ${muted}`}>
                      <span>{product.categoryName ?? 'Uncategorized'}</span>
                      {product.rack && <span>Rack {product.rack}</span>}
                      {product.brand && <span>{product.brand}</span>}
                      {expDays !== null && (
                        <span className={expDays < 0 ? 'text-red-700' : expDays <= 60 ? 'text-amber-700' : ''}>
                          {expDays < 0 ? 'Expired' : expDays === 0 ? 'Today' : `${expDays}d left`}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`font-bold ${strong}`}>{formatINR(product.price)}</p>
                    <p className={`text-xs ${muted}`}>
                      {product.stock} left · min {product.minStock}
                    </p>
                    {product.costPrice != null && (
                      <p className={`text-[11px] ${muted}`}>buy {formatINR(product.costPrice)}</p>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2 border-t border-black/5 pt-2">
                  <select
                    value={product.categoryId ?? ''}
                    onChange={(e) =>
                      handleMapCategory(product, e.target.value ? Number(e.target.value) : null)
                    }
                    className={`max-w-[55%] truncate rounded-md border px-2 py-1.5 text-xs ${
                      low ? 'border-red-400 bg-white/90 text-gray-800' : 'border-gray-300 bg-white text-gray-600'
                    }`}
                  >
                    <option value="">Uncategorized</option>
                    {categories?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setRestockTarget(product)}
                      title="Restock"
                      className={low || out ? 'text-white' : 'text-blue-600'}
                    >
                      <PackagePlus className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(product.id)
                        setShowForm(true)
                      }}
                      title="Edit"
                      className={low || out ? 'text-white' : 'text-green-600'}
                    >
                      <Pencil className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      title="Delete"
                      className={low || out ? 'text-white' : 'text-red-500'}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <p className="px-3 py-10 text-center text-sm text-gray-500">No products found.</p>
          )}
        </div>

        <table className="hidden w-full text-sm lg:table">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Product</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Code / Barcode</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Brand</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Rack</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Category</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Supplier</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Price</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Quantity</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Expiry</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pager.pageItems.map((product) => {
              const out = product.stock <= 0
              const low = !out && product.lowStock
              const expDays = product.expiryDate
                ? Math.ceil((Date.parse(product.expiryDate) - Date.now()) / 86400000)
                : null
              const recent =
                !!product.restockAt &&
                Date.now() - Date.parse(product.restockAt) < 5 * 60 * 1000
              const sub = out
                ? 'text-gray-400'
                : low
                  ? 'text-red-100'
                  : recent
                    ? 'text-amber-800'
                    : 'text-gray-500'
              const bodyCol = out
                ? 'text-gray-500'
                : low
                  ? 'text-white'
                  : recent
                    ? 'text-amber-900'
                    : 'text-gray-600'
              return (
                <tr
                  key={product.id}
                  className={`border-b last:border-0 ${
                    out
                      ? 'bg-gray-200 opacity-60 grayscale'
                      : low
                        ? 'bg-red-600'
                        : recent
                          ? 'bg-amber-100'
                          : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-3">
                    <span
                      className={`font-medium ${
                        out ? 'text-gray-500' : low ? 'text-white' : recent ? 'text-amber-900' : 'text-gray-900'
                      }`}
                    >
                      {product.name}
                    </span>
                    <span
                      className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        (product.shop ?? 'GROCERY') === 'IMOBILE'
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {(product.shop ?? 'GROCERY') === 'IMOBILE' ? 'iMobile' : 'Grocery'}
                    </span>
                    {recent && !out && !low && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        <PackagePlus className="h-3 w-3" />
                        {product.restockAuto ? 'Auto-restocked' : 'Restocked'} +{product.restockQty}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex flex-col">
                      {product.code && (
                        <span className={`font-mono text-xs ${sub}`}>#{product.code}</span>
                      )}
                      <span className={`font-mono text-[11px] ${sub}`}>
                        {product.barcode ?? (product.code ? '' : '—')}
                      </span>
                    </span>
                  </td>
                  <td className={`px-4 py-3 ${bodyCol}`}>{product.brand ?? '—'}</td>
                  <td className={`px-4 py-3 ${bodyCol}`}>{product.rack ?? '—'}</td>
                <td className="px-4 py-3">
                  <select
                    value={product.categoryId ?? ''}
                    onChange={(e) =>
                      handleMapCategory(product, e.target.value ? Number(e.target.value) : null)
                    }
                    title="Map this product to a category"
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">– Uncategorized –</option>
                    {categories?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={`px-4 py-3 ${bodyCol}`}>{product.supplierName ?? '-'}</td>
                <td className={`px-4 py-3 ${bodyCol}`}>
                  <span className="flex flex-col">
                    <span>{formatINR(product.price)}</span>
                    {product.costPrice != null && (
                      <span className={`text-[11px] ${sub}`}>buy {formatINR(product.costPrice)}</span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex flex-col gap-0.5">
                    <span className={`text-sm font-bold ${
                      out ? 'text-gray-500' : low ? 'text-white' : recent ? 'text-amber-900' : 'text-gray-900'
                    }`}>
                      {product.stock} left
                    </span>
                    <span className={`text-[11px] ${sub}`}>
                      sold {product.soldCount ?? 0} · min {product.minStock}
                      {recent && !out && !low &&
                        ` · +${product.restockQty} ${product.restockAuto ? 'auto-restocked' : 'restocked'} just now`}
                      {out ? ' · OUT!' : low ? ' · LOW!' : ''}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  {expDays === null ? (
                    <span className={`text-xs ${sub}`}>—</span>
                  ) : (
                    <span className="flex flex-col gap-0.5">
                      <span className={`text-[11px] ${sub}`}>{product.expiryDate}</span>
                      <span
                        className={`inline-block w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          expDays < 0
                            ? 'bg-red-100 text-red-700'
                            : expDays <= 60
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {expDays < 0 ? 'Expired' : expDays === 0 ? 'Today' : `${expDays}d left`}
                      </span>
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setRestockTarget(product)}
                    title="Restock"
                    className={`mr-3 ${
                      out
                        ? 'text-gray-500 hover:text-gray-700'
                        : low
                          ? 'text-white hover:text-red-100'
                          : 'text-blue-600 hover:text-blue-700'
                    }`}
                  >
                    <PackagePlus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(product.id)
                      setShowForm(true)
                    }}
                    className={`mr-3 ${
                      out
                        ? 'text-gray-500 hover:text-gray-700'
                        : low
                          ? 'text-white hover:text-red-100'
                          : 'text-green-600 hover:text-green-700'
                    }`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className={
                      out
                        ? 'text-gray-500 hover:text-gray-700'
                        : low
                          ? 'text-white hover:text-red-100'
                          : 'text-red-500 hover:text-red-600'
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination {...pager} itemLabel="products" />
      </div>

      {scanOpen && (
        <Suspense fallback={null}>
          <CameraScanner
            onCode={handleQuickScan}
            onClose={() => setScanOpen(false)}
            title="Scan barcode to find or add"
          />
        </Suspense>
      )}

      {showForm && (
        <ProductForm
          productId={editingId}
          categories={categories ?? []}
          suppliers={suppliers ?? []}
          initialBarcode={scanPrefill}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            refresh()
          }}
        />
      )}

      {restockTarget && (
        <RestockModal
          product={restockTarget}
          onClose={() => setRestockTarget(null)}
          onRestocked={() => {
            setRestockTarget(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}

function ProductForm({
  productId,
  categories,
  suppliers,
  initialBarcode,
  onClose,
  onSaved,
}: {
  productId: number | null
  categories: { id: number; name: string }[]
  suppliers: { id: number; name: string }[]
  initialBarcode?: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const { data: product } = useProducts()
  const existing = product?.find((p) => p.id === productId)

  const [form, setForm] = useState(() =>
    existing
      ? {
          name: existing.name,
          code: existing.code ?? '',
          barcode: existing.barcode ?? '',
          description: existing.description ?? '',
          brand: existing.brand ?? '',
          rack: existing.rack ?? '',
          price: String(existing.price),
          costPrice: existing.costPrice != null ? String(existing.costPrice) : '',
          expiryDate: existing.expiryDate ?? '',
          stock: String(existing.stock),
          minStock: String(existing.minStock),
          imageUrl: existing.imageUrl ?? '',
          categoryId: existing.categoryId ? String(existing.categoryId) : '',
          supplierId: existing.supplierId ? String(existing.supplierId) : '',
          shop: existing.shop ?? 'GROCERY',
        }
      : { ...emptyForm, barcode: initialBarcode ?? '' }
  )
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)

  const handleScan = (raw: string) => {
    const code = raw.replace(/[\s\r\n]+/g, '').trim()
    if (!code) return
    setForm(prev => ({ ...prev, barcode: code }))
    setScannerOpen(false)
    setError('')
  }

  const isEdit = productId !== null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const payload = {
      name: form.name,
      code: form.code.trim() || undefined,
      barcode: form.barcode.trim() || undefined,
      description: form.description || undefined,
      brand: form.brand.trim() || undefined,
      rack: form.rack.trim() || undefined,
      price: Number(form.price),
      costPrice: form.costPrice.trim() === '' ? undefined : Number(form.costPrice),
      expiryDate: form.expiryDate || undefined,
      stock: Number(form.stock),
      minStock: Number(form.minStock || 10),
      imageUrl: form.imageUrl || undefined,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      supplierId: form.supplierId ? Number(form.supplierId) : null,
      shop: form.shop,
    }
    try {
      if (isEdit && productId) {
        await productApi.update(productId, payload)
      } else {
        await productApi.create(payload)
      }
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {isEdit ? 'Edit Product' : 'Add Product'}
        </h3>

        {error && <div className="mb-4 px-4 py-2 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Till code</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="0001"
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
              <input
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                placeholder="8901058…"
                className={`${inputClass} font-mono`}
              />
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-green-600 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 hover:bg-green-100 active:bg-green-200"
              >
                <Camera className="h-5 w-5" />
                Scan with camera
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={inputClass} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="e.g. Amul, Britannia" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rack / shelf</label>
              <input value={form.rack} onChange={(e) => setForm({ ...form, rack: e.target.value })} placeholder="e.g. A2 or Aisle 3 Shelf B" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Selling price *</label>
              <input required type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buying price <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input type="number" step="0.01" min="0" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} placeholder="your cost" className={inputClass} />
              <p className="mt-1 text-[11px] text-gray-400">Used for the profit report.</p>
            </div>
          </div>
          <div className="rounded-lg border-2 border-green-300 bg-green-50 p-3">
            <label className="block text-sm font-bold text-green-800 mb-1">Quantity *</label>
            <input required type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className={`${inputClass} font-semibold`} />
            <p className="mt-1 text-[11px] text-green-700">How many units you have right now.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min quantity</label>
              <input type="number" min="0" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry date <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Shop</label>
              <select value={form.shop} onChange={(e) => setForm({ ...form, shop: e.target.value })} className={inputClass}>
                <option value="GROCERY">Grocery shop</option>
                <option value="IMOBILE">iMobile shop</option>
              </select>
              <p className="mt-1 text-[11px] text-gray-400">
                Bills are numbered G for grocery, M for iMobile and X for a mixed bill.
              </p>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={inputClass}>
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className={inputClass}>
              <option value="">None</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <ImageUpload value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-600 border hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>

      {scannerOpen && (
        <Suspense fallback={null}>
          <CameraScanner onCode={handleScan} onClose={() => setScannerOpen(false)} title="Scan product barcode" />
        </Suspense>
      )}
    </div>
  )
}
