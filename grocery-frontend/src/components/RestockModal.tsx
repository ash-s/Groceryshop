import { useState, type FormEvent } from 'react'
import { lazy, Suspense } from 'react'
import { CalendarClock, CheckCircle2, X, Camera } from 'lucide-react'
import ScanInput from './ScanInput'
import { productApi } from '../api/catalog'
import { getErrorMessage } from '../api/auth'
import type { Product } from '../types'

// Lazy load the camera scanner to keep bundle small
const CameraScanner = lazy(() => import('./CameraScanner'))

const DELIVERY_OPTIONS = [
  { value: 'SUPPLIER', label: 'Supplier delivered' },
  { value: 'COURIER', label: 'Courier' },
  { value: 'SELF_PICKUP', label: 'Self pickup' },
  { value: 'OTHER', label: 'Other' },
]

export default function RestockModal({
  product,
  onClose,
  onRestocked,
}: {
  product: Product
  onClose: () => void
  onRestocked: () => void
}) {
  const suggested = Math.max(1, product.minStock - product.stock, product.soldCount ?? 0)
  const [qty, setQty] = useState(String(suggested))
  const [deliveryMethod, setDeliveryMethod] = useState('')
  const [cost, setCost] = useState('')
  const [receivedDate, setReceivedDate] = useState('')
  const [expectedDelivery, setExpectedDelivery] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const low = product.stock <= 0 || product.lowStock

  const pending = expectedDelivery.length > 0

  const handleScan = (raw: string) => {
    const code = raw.replace(/[\s\r\n]+/g, '').trim()
    if (!code) return
    // Only accept the packet that belongs to this product — never add stock to
    // the wrong item because a nearby barcode got scanned.
    const needle = code.toLowerCase()
    const matches = [product.barcode, product.code].some(
      (value) => (value ?? '').trim().toLowerCase() === needle
    )
    if (!matches) {
      setError(
        `Scanned "${code}" does not match ${product.name}. Scan the label on this product's packet.`
      )
      return
    }
    setQty('1')
    setScannerOpen(false)
    setError('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const quantity = Number(qty)
    if (!Number.isInteger(quantity) || quantity < 1) {
      setError('Enter a whole number of at least 1.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await productApi.restock(product.id, {
        quantity,
        deliveryMethod: deliveryMethod || undefined,
        costPerUnit: cost.trim() ? Number(cost) : undefined,
        expectedDelivery: pending ? expectedDelivery : undefined,
        receivedAt:
          pending || !receivedDate ? undefined : `${receivedDate}T00:00:00`,
        notes: notes.trim() || undefined,
      })
      setDone(
        pending
          ? `Delivery scheduled for ${new Date(`${expectedDelivery}T00:00:00`).toLocaleDateString()}. Stock is NOT added yet - the pending delivery will show on the Restock page and in the in-app banner. When the goods arrive, click Mark Delivered and the stock is added automatically.`
          : 'Stock added. The restock is recorded in Restock History.'
      )
      onRestocked()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500'

  if (done) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-4 sm:p-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="mb-2 text-center text-lg font-bold text-gray-900">
            {pending ? 'Delivery Scheduled' : 'Restock Complete'}
          </h3>
          <p className="mb-5 text-sm text-gray-600">{done}</p>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Restock Product</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            low ? 'bg-red-600 text-white' : 'bg-gray-50 text-gray-600'
          }`}
        >
          <p className="font-semibold">
            {product.name} {product.code ? `(${product.code})` : ''}
          </p>
          <p>
            Current stock: {product.stock} · min {product.minStock} · sold {product.soldCount ?? 0}
          </p>
        </div>

        {/* USB/Bluetooth gun types into this box, Enter confirms; camera on the right */}
        <div className="mb-4 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <ScanInput onScan={handleScan} placeholder="Scan or type code" />
          </div>
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            title="Scan with camera"
            className="flex w-10 shrink-0 items-center justify-center self-stretch rounded-lg border border-green-600 bg-green-50 text-green-700 active:bg-green-100"
          >
            <Camera className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="mb-4 px-4 py-2 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to add *</label>
            <input
              type="number"
              min={1}
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400">
              Suggested {suggested} — fills to the min level / matches units sold.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                How was it delivered?
              </label>
              <select
                value={deliveryMethod}
                onChange={(e) => setDeliveryMethod(e.target.value)}
                className={inputClass}
              >
                <option value="">– Select –</option>
                {DELIVERY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost per unit</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expected delivery date <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="date"
              value={expectedDelivery}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setExpectedDelivery(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 flex items-start gap-1 text-xs text-gray-400">
              <CalendarClock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              Leave blank to add stock now. When set, stock is <strong>not</strong> added yet — the
              delivery stays pending, you get alerts on that date (WhatsApp + in-app), and stock is
              added the moment you click Mark Delivered after the goods arrive.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {!pending && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Received on</label>
                <input
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-gray-400">Blank = today</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Invoice, batch, remarks…"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-md text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Saving…' : pending ? 'Schedule Delivery' : 'Add to Stock'}
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