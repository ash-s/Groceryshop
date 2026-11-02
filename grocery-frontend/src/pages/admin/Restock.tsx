import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatINR } from '../../lib/format'
import {
  AlertTriangle,
  MessageCircle,
  PackagePlus,
  PackageSearch,
  Search,
} from 'lucide-react'
import { productApi } from '../../api/catalog'
import { settingsApi } from '../../api/settings'
import { restockHistoryApi } from '../../api/restockHistory'
import { useProducts } from '../../hooks/useCatalog'
import { getErrorMessage } from '../../api/auth'
import Pagination from '../../components/Pagination'
import RestockModal from '../../components/RestockModal'
import { usePagination } from '../../hooks/usePagination'
import type { Product } from '../../types'

export default function Restock() {
  const queryClient = useQueryClient()
  const { data: products, isLoading } = useProducts()
  const [search, setSearch] = useState('')
  const [onlyLow, setOnlyLow] = useState(false)
  const [restockTarget, setRestockTarget] = useState<Product | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)

  // Pending deliveries (expected delivery date set — stock added on confirmation)
  const { data: pending } = useQuery({
    queryKey: ['pending-restocks'],
    queryFn: restockHistoryApi.getPending,
  })
  // Auto-restock toggle (persisted in the backend)
  const [autoRestockEnabled, setAutoRestockEnabled] = useState(true)
  const [stockMsg, setStockMsg] = useState<string | null>(null)

  useEffect(() => {
    settingsApi
      .getStock()
      .then((s) => setAutoRestockEnabled(s.autoRestockEnabled))
      .catch(() => {})
  }, [])

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['low-stock'] })
    queryClient.invalidateQueries({ queryKey: ['pending-restocks'] })
  }

  const handleToggleAutoRestock = async () => {
    const next = !autoRestockEnabled
    setStockMsg(null)
    try {
      const s = await settingsApi.updateStock({ autoRestockEnabled: next })
      setAutoRestockEnabled(s.autoRestockEnabled)
      setStockMsg(
        s.autoRestockEnabled
          ? 'Auto-restock ON - sales that hit the minimum add the sold quantity back automatically.'
          : 'Auto-restock OFF - sales now just alert when an item hits its minimum; restock manually or schedule a delivery.'
      )
    } catch (err) {
      setStockMsg(getErrorMessage(err))
    }
  }

  const lowProducts = (products ?? []).filter((p) => p.stock <= 0 || p.lowStock)

  const filtered = useMemo(() => {
    let list = products ?? []
    if (onlyLow) {
      list = list.filter((p) => p.stock <= 0 || p.lowStock)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.code ?? '').toLowerCase().includes(q) ||
          (p.brand ?? '').toLowerCase().includes(q) ||
          (p.supplierName ?? '').toLowerCase().includes(q) ||
          (p.categoryName ?? '').toLowerCase().includes(q)
      )
    }
    // Fully out of stock sinks to the bottom of the list.
    const rank = (p: Product) => (p.stock <= 0 ? 2 : p.lowStock ? 1 : 0)
    return [...list].sort((a, b) => rank(a) - rank(b))
  }, [products, onlyLow, search])

  const pager = usePagination(filtered, 10, `${search}|${onlyLow}`)

  const handleRestockAllLow = async () => {
    const items = products?.filter((p) => p.stock >= 0 && p.lowStock) ?? []
    if (items.length === 0) return
    if (!confirm(`Restock all ${items.length} low product(s)? Each gets topped up to its minimum.`)) return
    setBulkLoading(true)
    try {
      for (const p of items) {
        await productApi.restock(p.id, { quantity: Math.max(1, p.minStock - p.stock) })
      }
      refresh()
    } catch (err) {
      alert(getErrorMessage(err))
    } finally {
      setBulkLoading(false)
    }
  }

  if (isLoading) return <div className="text-center py-16">Loading...</div>

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-gray-900">Restock</h2>
        {lowProducts.length > 0 && (
          <button
            onClick={handleRestockAllLow}
            disabled={bulkLoading}
            className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 font-medium disabled:opacity-50 w-full sm:w-auto"
          >
            <PackagePlus className="h-4 w-4" />
            {bulkLoading ? 'Restocking…' : `Restock All Low (${lowProducts.length})`}
          </button>
        )}
      </div>

      {lowProducts.length > 0 && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-600 text-white text-sm">
          <AlertTriangle className="inline h-4 w-4 mr-1 -mt-0.5" />
          {lowProducts.length} product{lowProducts.length === 1 ? '' : 's'} at or below minimum stock
          {autoRestockEnabled
            ? ' — auto-restock topped them up at sale time, or top them up manually below.'
            : ' — auto-restock is OFF, so top them up manually or schedule a delivery below.'}{' '}
          {pending !== undefined && pending.length > 0 && (
            <Link to="/admin/orders" className="underline font-semibold">
              {pending.length} delivery{pending.length === 1 ? '' : 's'} pending - confirm in
              Deliveries.
            </Link>
          )}
        </div>
      )}

      {/* Stock behavior: auto-restock toggle */}
      <div className="mb-6 rounded-xl bg-white shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex items-start gap-3">
            <PackagePlus className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Auto-restock</h3>
              <p className="mt-0.5 text-xs text-gray-500">
                ON: a sale that drops an item to its minimum adds the sold quantity back automatically
                and alerts you + the supplier. OFF: sales simply leave the item low and alert — you
                restock manually (top up now, or schedule a delivery with an expected date).
              </p>
              {stockMsg && (
                <p className="mt-1 text-xs font-medium text-green-700">{stockMsg}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoRestockEnabled}
            onClick={handleToggleAutoRestock}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
              autoRestockEnabled ? 'bg-green-600' : 'bg-gray-300'
            }`}
            title={autoRestockEnabled ? 'Auto-restock is ON - click to turn off' : 'Auto-restock is OFF - click to turn on'}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                autoRestockEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* WhatsApp alerts — configured on the Settings page */}
      <div className="mb-6 rounded-xl bg-white shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex items-start gap-3">
            <MessageCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Low-stock WhatsApp alerts</h3>
              <p className="mt-0.5 text-xs text-gray-500">
                The admin and each product's supplier get a WhatsApp alert when an item hits its
                minimum stock. Configure the alert number, Meta Cloud API and template in Settings.
              </p>
            </div>
          </div>
          <Link
            to="/admin/settings"
            className="shrink-0 inline-flex items-center gap-1 px-4 py-2 rounded-md text-sm font-semibold text-white bg-gray-700 hover:bg-gray-800"
          >
            Alerts settings
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product, code, brand, category or supplier…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <button
          onClick={() => setOnlyLow((v) => !v)}
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
            onlyLow
              ? 'bg-red-600 text-white'
              : 'border border-gray-300 bg-white text-gray-600 hover:border-red-500'
          }`}
        >
          Only low stock ({lowProducts.length})
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center py-16 text-gray-500">
          No products found{onlyLow ? ' below minimum stock' : ''}.
        </p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden table-scroll table-scroll-wide">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Product</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Supplier</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Price</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Stock</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Restock</th>
              </tr>
            </thead>
            <tbody>
              {pager.pageItems.map((product) => {
                const out = product.stock <= 0
                const low = !out && product.lowStock
                const rowCls = out
                  ? 'border-b last:border-0 bg-gray-200 opacity-60 grayscale'
                  : low
                    ? 'border-b last:border-0 bg-red-600'
                    : 'border-b last:border-0 hover:bg-gray-50'
                const nameCol = out ? 'text-gray-500' : low ? 'text-white' : 'text-gray-900'
                const codeCol = out ? 'text-gray-400' : low ? 'text-red-100' : 'text-gray-400'
                const bodyCol = out ? 'text-gray-500' : low ? 'text-white' : 'text-gray-600'
                const stockMain = out ? 'text-gray-500' : low ? 'text-white' : 'text-gray-900'
                const stockSub = out ? 'text-gray-400' : low ? 'text-red-100' : 'text-gray-500'
                return (
                  <tr key={product.id} className={rowCls}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-9 w-9 rounded object-cover"
                          />
                        ) : (
                          <PackageSearch
                            className={`h-5 w-5 ${out ? 'text-gray-400' : low ? 'text-white' : 'text-gray-300'}`}
                          />
                        )}
                        <div>
                          <p className={`font-medium ${nameCol}`}>{product.name}</p>
                          <p className={`font-mono text-[11px] ${codeCol}`}>{product.code ?? '—'}</p>
                          {product.brand && (
                            <p className={`text-[11px] ${codeCol}`}>{product.brand}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={`px-4 py-3 ${bodyCol}`}>{product.categoryName ?? '-'}</td>
                    <td className={`px-4 py-3 ${bodyCol}`}>{product.supplierName ?? '-'}</td>
                    <td className={`px-4 py-3 ${bodyCol}`}>{formatINR(product.price)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold ${stockMain}`}>{product.stock}</span>{' '}
                      <span className={`text-[11px] ${stockSub}`}>
                        left · sold {product.soldCount ?? 0} · min {product.minStock}
                        {out ? ' · OUT!' : low ? ' · LOW!' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setRestockTarget(product)}
                        title={`Restock ${product.name}`}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                          low
                            ? 'bg-white text-red-600 hover:bg-red-100'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        <PackagePlus className="h-3.5 w-3.5" />
                        Restock
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <Pagination {...pager} itemLabel="products" />
          <p className="px-4 py-3 text-xs text-gray-400">
            {autoRestockEnabled
              ? 'Automatic restock is ON — when a sale drops an item to its minimum, the sold quantity is added back and the admin + supplier get a WhatsApp alert. Fully out of stock items are greyed out, cannot be billed and are listed last.'
              : 'Automatic restock is OFF — sales only alert when an item hits its minimum; stock is never added by itself. Restock manually: add stock now, or schedule a delivery with an expected date and confirm it when it arrives.'}
          </p>
        </div>
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