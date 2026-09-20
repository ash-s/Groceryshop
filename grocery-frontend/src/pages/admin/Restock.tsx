import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  MessageCircle,
  PackagePlus,
  PackageSearch,
  Phone,
  Search,
} from 'lucide-react'
import { productApi } from '../../api/catalog'
import { settingsApi } from '../../api/settings'
import { useProducts } from '../../hooks/useCatalog'
import { getErrorMessage } from '../../api/auth'
import RestockModal from '../../components/RestockModal'
import type { Product } from '../../types'

export default function Restock() {
  const queryClient = useQueryClient()
  const { data: products, isLoading } = useProducts()
  const [search, setSearch] = useState('')
  const [onlyLow, setOnlyLow] = useState(false)
  const [restockTarget, setRestockTarget] = useState<Product | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)

  // WhatsApp alert number
  const [phone, setPhone] = useState('')
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [phoneMsg, setPhoneMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    settingsApi
      .getWhatsApp()
      .then((s) => setPhone(s.ownerPhone))
      .catch(() => {})
  }, [])

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['low-stock'] })
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
          (p.supplierName ?? '').toLowerCase().includes(q) ||
          (p.categoryName ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [products, onlyLow, search])

  const handleRestockAllLow = async () => {
    const items = products?.filter((p) => p.stock >= 0 && p.lowStock) ?? []
    if (items.length === 0) return
    if (!confirm(`Restock all ${items.length} low product(s)? Each gets topped up to its minimum.`)) return
    setBulkLoading(true)
    try {
      for (const p of items) {
        await productApi.restock(p.id, Math.max(1, p.minStock - p.stock))
      }
      refresh()
    } catch (err) {
      alert(getErrorMessage(err))
    } finally {
      setBulkLoading(false)
    }
  }

  const handleSavePhone = async (e: FormEvent) => {
    e.preventDefault()
    setPhoneLoading(true)
    setPhoneMsg(null)
    try {
      const s = await settingsApi.updateWhatsApp(phone)
      setPhone(s.ownerPhone)
      setPhoneMsg({ ok: true, text: `WhatsApp alert number saved: ${s.ownerPhone}` })
    } catch (err) {
      setPhoneMsg({ ok: false, text: getErrorMessage(err) })
    } finally {
      setPhoneLoading(false)
    }
  }

  if (isLoading) return <div className="text-center py-16">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Restock</h2>
        {lowProducts.length > 0 && (
          <button
            onClick={handleRestockAllLow}
            disabled={bulkLoading}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 font-medium disabled:opacity-50"
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
          — auto-restock topped them up at sale time, or top them up manually below.
        </div>
      )}

      {/* WhatsApp alert number */}
      <form
        onSubmit={handleSavePhone}
        className="mb-6 rounded-xl bg-white shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3"
      >
        <div className="flex items-center gap-2 flex-1">
          <Phone className="h-5 w-5 text-green-600 shrink-0" />
          <div className="flex-1">
            <label htmlFor="wa-phone" className="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp alert number (admin)
            </label>
            <input
              id="wa-phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91XXXXXXXXXX"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Low-stock WhatsApp alerts are sent to this number and to each product's supplier.
            </p>
          </div>
        </div>
        <button
          type="submit"
          disabled={phoneLoading}
          className="shrink-0 inline-flex items-center justify-center gap-1 px-4 py-2 rounded-md text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
        >
          <MessageCircle className="h-4 w-4" />
          {phoneLoading ? 'Saving…' : 'Save Number'}
        </button>
        {phoneMsg && (
          <p className={`shrink-0 text-sm ${phoneMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
            {phoneMsg.text}
          </p>
        )}
      </form>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product, code, category or supplier…"
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
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
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
              {filtered.map((product) => {
                const danger = product.stock <= 0 || product.lowStock
                return (
                  <tr
                    key={product.id}
                    className={`border-b last:border-0 ${danger ? 'bg-red-600' : 'hover:bg-gray-50'}`}
                  >
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
                            className={`h-5 w-5 ${danger ? 'text-white' : 'text-gray-300'}`}
                          />
                        )}
                        <div>
                          <p className={`font-medium ${danger ? 'text-white' : 'text-gray-900'}`}>
                            {product.name}
                          </p>
                          <p className={`font-mono text-[11px] ${danger ? 'text-red-100' : 'text-gray-400'}`}>
                            {product.code ?? '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className={`px-4 py-3 ${danger ? 'text-white' : 'text-gray-600'}`}>
                      {product.categoryName ?? '-'}
                    </td>
                    <td className={`px-4 py-3 ${danger ? 'text-white' : 'text-gray-600'}`}>
                      {product.supplierName ?? '-'}
                    </td>
                    <td className={`px-4 py-3 ${danger ? 'text-white' : 'text-gray-600'}`}>
                      ${product.price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold ${danger ? 'text-white' : 'text-gray-900'}`}>
                        {product.stock}
                      </span>{' '}
                      <span className={`text-[11px] ${danger ? 'text-red-100' : 'text-gray-500'}`}>
                        left · sold {product.soldCount ?? 0} · min {product.minStock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setRestockTarget(product)}
                        title={`Restock ${product.name}`}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                          danger
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
          <p className="px-4 py-3 text-xs text-gray-400">
            Automatic restock is on — when a sale drops an item to its minimum, the sold quantity is
            added back and the admin + supplier get a WhatsApp alert.
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