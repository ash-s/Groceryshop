import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  PackagePlus,
  PackageSearch,
  Phone,
  Search,
  Send,
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
  const [testLoading, setTestLoading] = useState(false)
  const [phoneMsg, setPhoneMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Meta Cloud API (real alerts)
  const [metaEnabled, setMetaEnabled] = useState(false)
  const [metaToken, setMetaToken] = useState('')
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState('')
  const [metaTemplateName, setMetaTemplateName] = useState('grocery_shop_restock_alert')
  const [copied, setCopied] = useState(false)

  const TEMPLATE_BODY =
    'GroceryShop alert {{1}}: LOW STOCK - {{2}} (code {{3}}), only {{4}} left, minimum {{5}}. Price {{6}}. Supplier: {{7}}. {{8}}'

  useEffect(() => {
    settingsApi
      .getWhatsApp()
      .then((s) => {
        setPhone(s.ownerPhone)
        setMetaEnabled(s.metaEnabled)
        setMetaToken(s.metaToken ?? '')
        setMetaPhoneNumberId(s.metaPhoneNumberId ?? '')
        setMetaTemplateName(s.metaTemplateName || 'grocery_shop_restock_alert')
      })
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
        await productApi.restock(p.id, { quantity: Math.max(1, p.minStock - p.stock) })
      }
      refresh()
    } catch (err) {
      alert(getErrorMessage(err))
    } finally {
      setBulkLoading(false)
    }
  }

  const liveOn = metaEnabled && !!metaToken.trim() && !!metaPhoneNumberId.trim()

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault()
    setPhoneLoading(true)
    setPhoneMsg(null)
    try {
      const s = await settingsApi.updateWhatsApp({
        ownerPhone: phone,
        metaEnabled,
        metaToken,
        metaPhoneNumberId,
        metaTemplateName,
      })
      setPhone(s.ownerPhone)
      setMetaEnabled(s.metaEnabled)
      setMetaToken(s.metaToken ?? '')
      setMetaPhoneNumberId(s.metaPhoneNumberId ?? '')
      setMetaTemplateName(s.metaTemplateName || 'grocery_shop_restock_alert')
      setPhoneMsg({
        ok: true,
        text:
          s.metaEnabled && s.metaToken && s.metaPhoneNumberId
            ? 'Settings saved - real Meta alerts are ON.'
            : 'Settings saved - alerts are simulated (backend console only).',
      })
    } catch (err) {
      setPhoneMsg({ ok: false, text: getErrorMessage(err) })
    } finally {
      setPhoneLoading(false)
    }
  }

  const copyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(TEMPLATE_BODY)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const handleTest = async () => {
    setTestLoading(true)
    setPhoneMsg(null)
    try {
      const r = await settingsApi.sendTest()
      setPhoneMsg({ ok: r.status !== 'FAILED', text: r.detail })
    } catch (err) {
      setPhoneMsg({ ok: false, text: getErrorMessage(err) })
    } finally {
      setTestLoading(false)
    }
  }

  // Free click-to-chat: no provider or setup — opens WhatsApp with a ready message.
  const waLink = phone
    ? `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
        'GroceryShop test alert: WhatsApp alerts are set up. Low-stock notices include product name, code, price, quantity and the auto-restocked amount.'
      )}`
    : '#'

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

      {/* WhatsApp alerts */}
      <form onSubmit={handleSaveSettings} className="mb-6 rounded-xl bg-white shadow-sm p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
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
                Low-stock alerts go to this number and to each product's supplier.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="submit"
              disabled={phoneLoading}
              className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-md text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              <MessageCircle className="h-4 w-4" />
              {phoneLoading ? 'Saving…' : 'Save Settings'}
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={testLoading}
              className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-md text-sm font-semibold text-white bg-gray-700 hover:bg-gray-800 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {testLoading ? 'Sending…' : 'Test Alert'}
            </button>
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              title="Opens WhatsApp with a pre-filled message on your phone - free, no setup"
              className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-md text-sm font-semibold text-green-700 border border-green-600 hover:bg-green-50"
            >
              <ExternalLink className="h-4 w-4" />
              Open WhatsApp
            </a>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-700">
              Real alerts via Meta Cloud API (WhatsApp Business Platform)
            </h3>
            {liveOn ? (
              <span className="rounded-full bg-green-100 text-green-700 px-2.5 py-0.5 text-xs font-semibold">
                Live - sending via Meta
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-xs font-semibold">
                Simulated - console only
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Free to set up and includes 1,000 free service conversations per month. Enter your token and phone
            number ID below, create the message template, then enable real low-stock alerts. Left off, alerts are
            logged to the backend console only.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 mt-3">
            <div>
              <label htmlFor="meta-token" className="block text-xs font-medium text-gray-600 mb-1">
                Meta access token
              </label>
              <input
                id="meta-token"
                type="password"
                value={metaToken}
                onChange={(e) => setMetaToken(e.target.value)}
                placeholder="Paste your long-lived system user token"
                autoComplete="off"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label htmlFor="meta-phone-id" className="block text-xs font-medium text-gray-600 mb-1">
                Phone number ID (your business WhatsApp number)
              </label>
              <input
                id="meta-phone-id"
                type="text"
                value={metaPhoneNumberId}
                onChange={(e) => setMetaPhoneNumberId(e.target.value)}
                placeholder="e.g. 123456789012345"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label htmlFor="meta-template" className="block text-xs font-medium text-gray-600 mb-1">
                Message template name
              </label>
              <input
                id="meta-template"
                type="text"
                value={metaTemplateName}
                onChange={(e) => setMetaTemplateName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={metaEnabled}
                  onChange={(e) => setMetaEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                Send real alerts when low stock is hit
              </label>
            </div>
          </div>
          <div className="mt-3 rounded-md bg-gray-50 border border-gray-200 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-gray-600">
                Template body to create in Meta (category: Utility):
              </p>
              <button
                type="button"
                onClick={copyTemplate}
                className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 hover:text-green-800"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="mt-1 font-mono text-[11px] text-gray-600 break-words">{TEMPLATE_BODY}</p>
            <p className="mt-2 text-[11px] text-gray-400">
              In Business Manager, open WhatsApp Manager then Message templates, create a template with category
              Utility and language English (en), with the body above. Name must match the template name field
              exactly. After approval, enable real alerts and test.
            </p>
          </div>
        </div>

        {phoneMsg && (
          <p className={`text-sm ${phoneMsg.ok ? 'text-green-600' : 'text-red-600'}`}>{phoneMsg.text}</p>
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