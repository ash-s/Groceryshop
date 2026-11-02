import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PackagePlus, ScanLine, Search } from 'lucide-react'
import { barcodeApi } from '../../api/barcodes'
import { getErrorMessage } from '../../api/auth'
import ScanInput from '../../components/ScanInput'
import AddFromCatalogModal from '../../components/AddFromCatalogModal'
import Pagination from '../../components/Pagination'
import { usePagination } from '../../hooks/usePagination'
import type { BarcodeCatalogEntry } from '../../types'

/**
 * Built-in barcode catalog (inbuilt DB): a reference list of common grocery
 * items. Barcodes are attached by scanning the actual packet once (scan-to-set),
 * so a stored barcode is always the one printed on the product. Items can be
 * turned into real products (with the store's own price / rack / stock).
 */
export default function BarcodeCatalog() {
  const queryClient = useQueryClient()
  const { data: entries, isLoading } = useQuery({
    queryKey: ['barcode-catalog'],
    queryFn: () => barcodeApi.catalog(),
  })
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [setCodeRow, setSetCodeRow] = useState<number | null>(null)
  const [addTarget, setAddTarget] = useState<BarcodeCatalogEntry | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const categories = useMemo(
    () =>
      [...new Set((entries ?? []).map((e) => e.category).filter((c): c is string => !!c))].sort(),
    [entries]
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (entries ?? []).filter(
      (e) =>
        (!category || e.category === category) &&
        (!term ||
          e.name.toLowerCase().includes(term) ||
          (e.brand ?? '').toLowerCase().includes(term) ||
          (e.code ?? '').toLowerCase().includes(term))
    )
  }, [entries, search, category])

  const pager = usePagination(filtered, 12, `${search}|${category}`)

  const handleSetCode = async (id: number, code: string) => {
    try {
      await barcodeApi.setCode(id, code)
      await queryClient.invalidateQueries({ queryKey: ['barcode-catalog'] })
      setSetCodeRow(null)
      setMessage({ ok: true, text: `Barcode ${code} attached. This item now resolves on scan.` })
    } catch (err) {
      setMessage({ ok: false, text: getErrorMessage(err) })
    }
  }

  if (isLoading) return <div className="text-center py-16">Loading...</div>

  return (
    <div>
      <p className="text-sm text-gray-600 mb-4">
        Built-in reference list of common grocery items. Attach a barcode by scanning the actual
        packet once (scan-to-set) — then any scan of that code resolves instantly in Stock and
        Billing. Turn any item into a real product with your own price and rack via “Add as product”.
      </p>

      {message && (
        <div
          className={`mb-4 px-4 py-2 rounded-md text-sm ${
            message.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search catalog by name, brand or barcode…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Item</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Category</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Barcode</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pager.pageItems.map((entry) => (
              <tr key={entry.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900">{entry.name}</span>
                  {entry.brand && <span className="ml-2 text-xs text-gray-500">{entry.brand}</span>}
                </td>
                <td className="px-4 py-3 text-gray-600">{entry.category ?? '—'}</td>
                <td className="px-4 py-3">
                  {setCodeRow === entry.id ? (
                    <ScanInput
                      autoFocus
                      onScan={(code) => handleSetCode(entry.id, code)}
                      placeholder="Scan the actual packet, press Enter…"
                    />
                  ) : (
                    <span className="font-mono text-xs text-gray-600">
                      {entry.code ?? <span className="italic text-gray-400">no barcode yet</span>}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {setCodeRow === entry.id ? (
                    <button
                      onClick={() => setSetCodeRow(null)}
                      className="px-2 py-1 rounded-md text-gray-600 border hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setSetCodeRow(entry.id)}
                        title="Scan the packet to attach / verify its barcode"
                        className="text-green-600 hover:text-green-700 mr-4"
                      >
                        <ScanLine className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setAddTarget(entry)}
                        title="Add as a real product with your price, rack & stock"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <PackagePlus className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                  No catalog items match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination {...pager} itemLabel="catalog items" />
        <p className="px-4 py-3 text-xs text-gray-400">
          {entries?.length ?? 0} items in the built-in catalog. Barcodes are attached by scanning
          the actual packet once — nothing here is guessed, so a match always means the real product.
        </p>
      </div>

      {addTarget && (
        <AddFromCatalogModal
          initial={{
            name: addTarget.name,
            code: addTarget.code ?? '',
            brand: addTarget.brand,
            category: addTarget.category,
          }}
          onClose={() => setAddTarget(null)}
          onSaved={() => setAddTarget(null)}
        />
      )}
    </div>
  )
}