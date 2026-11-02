import { lazy, Suspense, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Camera } from 'lucide-react'
import { formatINR } from '../../lib/format'
import { useProducts } from '../../hooks/useCatalog'
import { productApi } from '../../api/catalog'
import { barcodeApi } from '../../api/barcodes'
import { getErrorMessage } from '../../api/auth'
import ScanInput from '../../components/ScanInput'
import useKeyboardWedge from '../../hooks/useKeyboardWedge'
import Pagination from '../../components/Pagination'
import AddFromCatalogModal, { type QuickAddInitial } from '../../components/AddFromCatalogModal'
import { usePagination } from '../../hooks/usePagination'
import type { BarcodeLookup, Product } from '../../types'

const CameraScanner = lazy(() => import('../../components/CameraScanner'))

const rank = (p: Product) => (p.stock <= 0 ? 2 : p.lowStock ? 1 : 0)

interface AdjustTarget {
  id: number
  name: string
  current: number
  rack: string | null
  mode: 'in' | 'out'
}

export default function Stock() {
  const queryClient = useQueryClient()
  const { data: products, isLoading } = useProducts()
  const [search, setSearch] = useState('')
  const [scanHint, setScanHint] = useState<{ ok: boolean; text: string } | null>(null)
  const [quickAdd, setQuickAdd] = useState<QuickAddInitial | null>(null)
  const [target, setTarget] = useState<AdjustTarget | null>(null)
  const [qty, setQty] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const scanRef = useRef<HTMLInputElement>(null)

  const filtered = products
    ?.filter((p) => {
      const term = search.trim().toLowerCase()
      if (!term) return true
      return (
        p.name.toLowerCase().includes(term) ||
        (p.code ?? '').toLowerCase().includes(term) ||
        (p.barcode ?? '').toLowerCase().includes(term) ||
        (p.rack ?? '').toLowerCase().includes(term)
      )
    })
    .sort((a, b) => rank(a) - rank(b))

  const pager = usePagination(filtered ?? [], 10, search)

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['products'] })

  const openAdjust = (product: Product, mode: 'in' | 'out') => {
    setTarget({
      id: product.id,
      name: product.name,
      current: product.stock,
      rack: product.rack,
      mode,
    })
    setQty('')
    setError('')
    setScanHint(null)
  }

  // Scan-first flow: exact code match opens the in/out dialog for that product.
  // Unknown codes fall back to a barcode lookup — the built-in catalog first,
  // then Open Food Facts online. If either knows the code we pre-fill name/brand;
  // otherwise the user names it. In all cases the scanned code is already
  // attached, so the next scan resolves instantly.
  const handleScan = async (code: string) => {
    setScanHint(null)
    const hit =
      products?.find(
        (p) => p.barcode && p.barcode.trim().toLowerCase() === code.toLowerCase()
      ) ??
      products?.find(
        (p) => p.code && p.code.trim().toLowerCase() === code.toLowerCase()
      )
    if (hit) {
      openAdjust(hit, 'in')
      return
    }
    let entry: BarcodeLookup | null = null
    try {
      entry = await barcodeApi.resolve(code)
    } catch {
      entry = null
    }
    const quantity =
      entry?.quantity && !entry.name.toLowerCase().includes(entry.quantity.toLowerCase())
        ? ` ${entry.quantity}`
        : ''
    setQuickAdd({
      name: entry ? `${entry.name}${quantity}` : '',
      code,
      brand: entry?.brand ?? null,
      category: entry?.category ?? null,
      source: entry?.source ?? null,
      imageUrl: entry?.imageUrl ?? null,
    })
    setScanHint(
      entry
        ? entry.source === 'OPENFOODFACTS'
          ? {
              ok: true,
              text: `Found online via Open Food Facts: "${entry.name}"${
                entry.brand ? ' by ' + entry.brand : ''
              } — not a product yet. Set your price, rack and stock below; future scans of this barcode open it instantly.`,
            }
          : {
              ok: true,
              text: `"${code}" is "${entry.brand ? entry.brand + ' ' : ''}${entry.name}" (${
                entry.category ?? 'catalog'
              }) — not a product yet. Set your price, rack and stock below; future scans of this barcode open it instantly.`,
            }
        : {
            ok: false,
            text: `No product has code "${code}", and it isn't in the built-in catalog or Open Food Facts. Give it a name below — the barcode is already attached, so it will work from the next scan.`,
          }
    )
  }

  const submitAdjust = async () => {
    if (!target) return
    const value = parseInt(qty, 10)
    if (!value || value <= 0) {
      setError('Enter a valid quantity.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const delta = target.mode === 'in' ? value : -value
      await productApi.updateStock(target.id, Math.max(0, target.current + delta))
      setTarget(null)
      setQty('')
      refresh()
      scanRef.current?.focus()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  // USB barcode gun works even after tapping around the page (tiles, buttons).
  useKeyboardWedge(handleScan, !target && !quickAdd && !scanOpen)

  if (isLoading) return <div className="text-center py-16">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Stock Details</h2>
      </div>

      {/* Scan bar — barcode gun works with any scanner that types + presses Enter. */}
      <div className="mb-4">
        <ScanInput
          inputRef={scanRef}
          onScan={handleScan}
          autoFocus
          placeholder="Scan or type code, press Enter…"
        />
        <button
          type="button"
          onClick={() => setScanOpen(true)}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-green-600 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-100 active:bg-green-200 sm:w-auto"
        >
          <Camera className="h-4 w-4" />
          Scan with camera
        </button>
        {scanHint && (
          <p className={`mt-2 text-sm ${scanHint.ok ? 'text-amber-700' : 'text-blue-700'}`}>
            {scanHint.text}
          </p>
        )}
      </div>

      <input
        type="text"
        placeholder="Search by name, code or rack…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm px-3 py-2 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
      />

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Product</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Code</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Rack</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Category</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Price</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Current Stock</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Min Stock</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pager.pageItems.map((product) => {
              const out = product.stock <= 0
              const low = !out && product.lowStock
              const status = out
                ? { label: 'Out of Stock', cls: 'bg-red-100 text-red-700' }
                : low
                  ? { label: 'Low Stock', cls: 'bg-amber-100 text-amber-700' }
                  : { label: 'In Stock', cls: 'bg-green-100 text-green-700' }
              return (
                <tr
                  key={product.id}
                  className={`border-b last:border-0 ${
                    out
                      ? 'bg-gray-200 opacity-60 grayscale'
                      : low
                        ? 'bg-red-600'
                        : 'hover:bg-gray-50'
                  }`}
                >
                  <td className={`px-4 py-3 font-medium ${out ? 'text-gray-500' : low ? 'text-white' : 'text-gray-900'}`}>
                    {product.name}
                  </td>
                  <td className={`px-4 py-3 font-mono text-xs ${out ? 'text-gray-400' : low ? 'text-red-100' : 'text-gray-500'}`}>
                    {product.code ?? '—'}
                  </td>
                  <td className={`px-4 py-3 ${out ? 'text-gray-400' : low ? 'text-red-100' : 'text-gray-600'}`}>
                    {product.rack ?? '—'}
                  </td>
                  <td className={`px-4 py-3 ${out ? 'text-gray-400' : low ? 'text-red-100' : 'text-gray-600'}`}>
                    {product.categoryName ?? '-'}
                  </td>
                  <td className={`px-4 py-3 ${out ? 'text-gray-500' : low ? 'text-white' : 'text-gray-600'}`}>
                    {formatINR(product.price)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${out ? 'text-gray-500' : low ? 'text-white' : 'text-gray-900'}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className={`px-4 py-3 ${out ? 'text-gray-500' : low ? 'text-red-100' : 'text-gray-500'}`}>
                    {product.minStock}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${status.cls}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => openAdjust(product, 'in')}
                      className={`${
                        out
                          ? 'text-gray-500 hover:text-gray-700'
                          : low
                            ? 'text-white hover:text-red-100'
                            : 'text-green-600 hover:text-green-700'
                      } mr-3`}
                      title="Add stock (stock in)"
                    >
                      + Add Stock
                    </button>
                    <button
                      onClick={() => openAdjust(product, 'out')}
                      className={
                        out
                          ? 'text-gray-500 hover:text-gray-700'
                          : low
                            ? 'text-white hover:text-red-100'
                            : 'text-red-500 hover:text-red-600'
                      }
                      title="Remove stock (stock out)"
                    >
                      − Stock Out
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered && filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination {...pager} itemLabel="products" />
      </div>

      {target && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setTarget({ ...target, mode: 'in' })}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold border ${
                  target.mode === 'in'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                + Add Stock
              </button>
              <button
                type="button"
                onClick={() => setTarget({ ...target, mode: 'out' })}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold border ${
                  target.mode === 'out'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                − Stock Out
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {target.name} · Current stock: <span className="font-medium text-gray-900">{target.current}</span>
              {target.rack && (
                <>
                  {' '}· Rack: <span className="font-medium text-gray-900">{target.rack}</span>
                </>
              )}
            </p>

            {error && <div className="mb-4 px-4 py-2 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>}

            <input
              type="number"
              min="1"
              autoFocus
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Quantity"
              className="w-full px-3 py-2 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setTarget(null)
                  scanRef.current?.focus()
                }}
                className="px-4 py-2 rounded-md text-gray-600 border hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitAdjust}
                disabled={loading}
                className="px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {quickAdd && (
        <AddFromCatalogModal
          initial={quickAdd}
          title="Add as Product"
          subtitle="This barcode isn't a product yet — set your price, rack and current stock. After saving, scanning this barcode opens stock in/out instantly."
          onClose={() => {
            setQuickAdd(null)
            setScanHint(null)
            scanRef.current?.focus()
          }}
          onSaved={() => {
            setQuickAdd(null)
            setScanHint(null)
            refresh()
            scanRef.current?.focus()
          }}
        />
      )}

      {scanOpen && (
        <Suspense fallback={null}>
          <CameraScanner
            onCode={(code) => {
              setScanOpen(false)
              void handleScan(code.replace(/[\s\r\n]+/g, ''))
            }}
            onClose={() => setScanOpen(false)}
            title="Scan barcode to add or remove stock"
          />
        </Suspense>
      )}
    </div>
  )
}