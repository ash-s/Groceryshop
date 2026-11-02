import { useCallback, useRef, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Check,
  Loader2,
  PackagePlus,
  Save,
  ScanLine,
  Search,
  StopCircle,
  Tags,
  Wand2,
} from 'lucide-react'
import { barcodeApi } from '../../api/barcodes'
import { productApi } from '../../api/catalog'
import { getErrorMessage } from '../../api/auth'
import AddFromCatalogModal from '../../components/AddFromCatalogModal'
import Pagination from '../../components/Pagination'
import { usePagination } from '../../hooks/usePagination'
import type { AutoMatchProposal, BarcodeLookup } from '../../types'

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500'

/** Colour a confidence score so obvious matches stand out from the doubtful ones. */
function scoreClass(score: number) {
  if (score >= 70) return 'bg-green-100 text-green-800'
  if (score >= 55) return 'bg-amber-100 text-amber-800'
  return 'bg-gray-100 text-gray-700'
}

/**
 * Open Food Facts tools: (1) search the online database by product name and add
 * results as real products or built-in catalog entries in one click, and
 * (2) automatically suggest barcodes for already-imported products that have
 * none, with a review-and-apply step before anything is written.
 */
export default function BarcodeTools() {
  const queryClient = useQueryClient()

  // ---- Section 1: online product search ----
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<BarcodeLookup[]>([])
  const [searched, setSearched] = useState(false)
  const [savedCodes, setSavedCodes] = useState<string[]>([])
  const [savingCode, setSavingCode] = useState<string | null>(null)
  const [addTarget, setAddTarget] = useState<BarcodeLookup | null>(null)
  const [searchMessage, setSearchMessage] = useState<{ ok: boolean; text: string } | null>(null)

  // ---- Section 2: auto-match barcodes for existing products ----
  const [matching, setMatching] = useState(false)
  const [scanned, setScanned] = useState(0)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [proposals, setProposals] = useState<AutoMatchProposal[]>([])
  const [selected, setSelected] = useState<Record<number, boolean>>({})
  const [applying, setApplying] = useState(false)
  const [matchMessage, setMatchMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [hasRun, setHasRun] = useState(false)
  const stopRef = useRef(false)

  const resultsPager = usePagination(results, 8, query)
  const proposalsPager = usePagination(proposals, 10)

  const handleSearch = async (e?: FormEvent) => {
    e?.preventDefault()
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setSearchMessage(null)
    setSearched(true)
    try {
      const data = await barcodeApi.search(q, 20)
      setResults(data)
      if (data.length === 0) {
        setSearchMessage({
          ok: false,
          text: 'Nothing found online for that name. Try a shorter or more common term.',
        })
      }
    } catch (err) {
      setResults([])
      setSearchMessage({ ok: false, text: getErrorMessage(err) })
    } finally {
      setSearching(false)
    }
  }

  const handleSaveToCatalog = async (item: BarcodeLookup) => {
    setSavingCode(item.code)
    setSearchMessage(null)
    try {
      await barcodeApi.addToCatalog({
        code: item.code,
        name: item.name,
        brand: item.brand,
        category: item.category,
      })
      await queryClient.invalidateQueries({ queryKey: ['barcode-catalog'] })
      setSavedCodes((prev) => (prev.includes(item.code) ? prev : [...prev, item.code]))
      setSearchMessage({ ok: true, text: `“${item.name}” saved to the built-in catalog.` })
    } catch (err) {
      setSearchMessage({ ok: false, text: getErrorMessage(err) })
    } finally {
      setSavingCode(null)
    }
  }

  const runMatch = useCallback(async () => {
    setMatching(true)
    setHasRun(true)
    setMatchMessage(null)
    setProposals([])
    setSelected({})
    setScanned(0)
    setRemaining(null)
    stopRef.current = false

    let afterId: number | null = 0
    let examined = 0
    const collected: AutoMatchProposal[] = []
    const chosen: Record<number, boolean> = {}

    try {
      while (!stopRef.current) {
        const res = await productApi.autoMatchBarcodes({ afterId, limit: 10 })
        examined += res.processed
        for (const p of res.proposals) {
          collected.push(p)
          chosen[p.productId] = true
        }
        setProposals([...collected])
        setSelected({ ...chosen })
        setScanned(examined)
        setRemaining(res.remaining)
        if (res.nextAfterId === null || res.processed === 0) break
        afterId = res.nextAfterId
      }

      const stopped = stopRef.current
      if (collected.length === 0) {
        setMatchMessage({
          ok: true,
          text: `Checked ${examined} product${examined === 1 ? '' : 's'} — no confident barcode matches found.`,
        })
      } else {
        setMatchMessage({
          ok: true,
          text: `${stopped ? 'Stopped early. ' : ''}Found ${collected.length} suggestion${
            collected.length === 1 ? '' : 's'
          } across ${examined} product${examined === 1 ? '' : 's'}. Review and apply below.`,
        })
      }
    } catch (err) {
      setMatchMessage({ ok: false, text: getErrorMessage(err) })
    } finally {
      setMatching(false)
      setRemaining(null)
    }
  }, [])

  const selectedCount = proposals.filter((p) => selected[p.productId]).length

  const toggleAll = (value: boolean) => {
    const next: Record<number, boolean> = {}
    for (const p of proposals) next[p.productId] = value
    setSelected(next)
  }

  const handleApply = async () => {
    const matches = proposals
      .filter((p) => selected[p.productId])
      .map((p) => ({ productId: p.productId, code: p.code }))
    if (matches.length === 0) {
      setMatchMessage({ ok: false, text: 'Select at least one suggestion to apply.' })
      return
    }
    setApplying(true)
    setMatchMessage(null)
    try {
      const res = await productApi.applyBarcodeMatches(matches)
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      const appliedIds = new Set(matches.map((m) => m.productId))
      setProposals((prev) => prev.filter((p) => !appliedIds.has(p.productId)))
      setSelected({})
      setMatchMessage({
        ok: true,
        text: `Attached ${res.applied} barcode${res.applied === 1 ? '' : 's'}${
          res.skipped ? `, skipped ${res.skipped}` : ''
        }.`,
      })
    } catch (err) {
      setMatchMessage({ ok: false, text: getErrorMessage(err) })
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* ---------------- Section 1: search online ---------------- */}
      <section className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-1">
          <Search className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-bold text-gray-900">Search products online</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Search Open Food Facts by name, then add it as a product or save it to the catalog.
        </p>

        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3 mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Maggi noodles, Amul butter, Nutella…"
            className={`${inputClass} flex-1 min-w-[240px]`}
          />
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {searching ? 'Searching…' : 'Search'}
          </button>
        </form>

        {searchMessage && (
          <div
            className={`mb-4 px-4 py-2 rounded-md text-sm ${
              searchMessage.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {searchMessage.text}
          </div>
        )}

        {results.length > 0 && (
          <div className="overflow-x-auto border rounded-lg table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Product</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Barcode</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resultsPager.pageItems.map((item, idx) => (
                  <tr key={`${item.code}-${idx}`} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="h-10 w-10 rounded-md object-cover border bg-white"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-md border bg-gray-50 flex items-center justify-center">
                            <PackagePlus className="h-4 w-4 text-gray-300" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{item.name}</div>
                          <div className="text-xs text-gray-500">
                            {item.brand ?? 'Unknown brand'}
                            {item.quantity ? ` · ${item.quantity}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {item.code || <span className="italic text-gray-400">none</span>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setAddTarget(item)}
                        disabled={!item.code}
                        title={item.code ? 'Add as a real product' : 'No barcode available for this item'}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 mr-4 disabled:opacity-40"
                      >
                        <PackagePlus className="h-4 w-4" /> Add
                      </button>
                      {savedCodes.includes(item.code) ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <Check className="h-4 w-4" /> Saved
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSaveToCatalog(item)}
                          disabled={savingCode === item.code}
                          title="Save to the built-in catalog"
                          className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 disabled:opacity-40"
                        >
                          {savingCode === item.code ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Catalog
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination {...resultsPager} itemLabel="results" />
          </div>
        )}

        {searched && !searching && results.length === 0 && !searchMessage && (
          <p className="text-sm text-gray-500">No results.</p>
        )}
      </section>

      {/* ---------------- Section 2: auto-match existing products ---------------- */}
      <section className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-1">
          <Wand2 className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-bold text-gray-900">Attach barcodes to your products</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Find barcodes for imported products. Nothing changes until you apply a suggestion.
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button
            onClick={runMatch}
            disabled={matching}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            {matching ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
            {matching ? 'Searching…' : hasRun ? 'Search again' : 'Find matches'}
          </button>
          {matching && (
            <button
              onClick={() => {
                stopRef.current = true
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 border hover:bg-gray-50"
            >
              <StopCircle className="h-4 w-4" /> Stop
            </button>
          )}
          {(matching || hasRun) && (
            <span className="text-sm text-gray-600">
              Checked {scanned}
              {remaining !== null ? ` · ${remaining} without a barcode left` : ''}
            </span>
          )}
        </div>

        {matchMessage && (
          <div
            className={`mb-4 px-4 py-2 rounded-md text-sm ${
              matchMessage.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {matchMessage.text}
          </div>
        )}

        {proposals.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">
                {selectedCount} of {proposals.length} selected
              </span>
              <div className="flex items-center gap-3 text-sm">
                <button onClick={() => toggleAll(true)} className="text-green-600 hover:text-green-700">
                  Select all
                </button>
                <button onClick={() => toggleAll(false)} className="text-gray-600 hover:text-gray-700">
                  Clear
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border rounded-lg table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-3 py-3 w-10"></th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Your product</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Suggested match</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Barcode</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-700">Match</th>
                  </tr>
                </thead>
                <tbody>
                  {proposalsPager.pageItems.map((p) => (
                    <tr key={p.productId} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={!!selected[p.productId]}
                          onChange={(e) =>
                            setSelected({ ...selected, [p.productId]: e.target.checked })
                          }
                          className="h-4 w-4 accent-green-600"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{p.productName}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.imageUrl && (
                            <img
                              src={p.imageUrl}
                              alt=""
                              className="h-9 w-9 rounded-md object-cover border bg-white"
                            />
                          )}
                          <div>
                            <div className="text-gray-900">{p.matchedName}</div>
                            <div className="text-xs text-gray-500">
                              {p.matchedBrand ?? 'Unknown brand'}
                              {p.quantity ? ` · ${p.quantity}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.code}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${scoreClass(
                            p.score
                          )}`}
                        >
                          {p.score}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination {...proposalsPager} itemLabel="suggestions" />
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={handleApply}
                disabled={applying || selectedCount === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tags className="h-4 w-4" />}
                {applying ? 'Applying…' : `Apply ${selectedCount} barcode${selectedCount === 1 ? '' : 's'}`}
              </button>
            </div>
          </>
        )}

        {hasRun && !matching && proposals.length === 0 && (
          <p className="text-sm text-gray-500">No suggestions to review.</p>
        )}
      </section>

      {addTarget && (
        <AddFromCatalogModal
          initial={{
            name: addTarget.name,
            code: addTarget.code,
            brand: addTarget.brand,
            category: addTarget.category,
            source: 'OPENFOODFACTS',
            imageUrl: addTarget.imageUrl,
          }}
          title="Add as Product"
          subtitle="Details looked up online from Open Food Facts. Set your selling price, rack and current stock — once saved, every future scan of this barcode resolves to this product."
          onClose={() => setAddTarget(null)}
          onSaved={() => setAddTarget(null)}
        />
      )}
    </div>
  )
}
