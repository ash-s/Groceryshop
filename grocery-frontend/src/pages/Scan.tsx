import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  Check,
  Delete,
  Loader2,
  Receipt,
  ScanLine,
  ShoppingBag,
  Smartphone,
  Wifi,
  X,
} from 'lucide-react'
import { bridgeApi, type BridgeScanResult } from '../api/bridge'
import { billingApi } from '../api/billing'
import { getErrorMessage } from '../api/auth'
import { formatINR } from '../lib/format'

const CameraScanner = lazy(() => import('../components/CameraScanner'))

interface PhoneLine {
  productId: number
  name: string
  price: number
  quantity: number
  stock: number
}

const PAYMENTS = ['CASH', 'UPI', 'CARD'] as const

/** Short tones so the cashier can work without looking at the phone. */
function useBeeps() {
  const ctxRef = useRef<AudioContext | null>(null)
  const ctx = () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    return ctxRef.current
  }
  const tone = useCallback((frequency: number, at: number, length: number) => {
    try {
      const audio = ctx()
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.type = 'sine'
      osc.frequency.value = frequency
      gain.gain.value = 0.16
      osc.connect(gain).connect(audio.destination)
      osc.start(audio.currentTime + at)
      osc.stop(audio.currentTime + at + length)
    } catch {
      /* audio blocked until the first tap; harmless */
    }
  }, [])
  const ok = useCallback(() => {
    tone(1240, 0, 0.07)
    if ('vibrate' in navigator) navigator.vibrate(35)
  }, [tone])
  const fail = useCallback(() => {
    tone(300, 0, 0.12)
    tone(220, 0.13, 0.14)
    if ('vibrate' in navigator) navigator.vibrate([45, 60, 45])
  }, [tone])
  return { ok, fail }
}

/**
 * The phone side of the counter.
 *
 * Paired once by scanning the QR on the desk. Every barcode read is sent to the
 * laptop, which decides what it means, and the phone answers with a beep and a
 * haptic tick - the cashier never has to look away from the packet.
 */
export default function Scan() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const tokenParam = params.get('t') ?? ''
  const codeParam = params.get('c') ?? ''

  const [token, setToken] = useState('')
  const [joining, setJoining] = useState(true)
  const [joinError, setJoinError] = useState('')
  const [canBill, setCanBill] = useState(false)
  const [ended, setEnded] = useState(false)

  const [scanning, setScanning] = useState(false)
  const [last, setLast] = useState<BridgeScanResult | null>(null)
  const [lines, setLines] = useState<PhoneLine[]>([])
  const [billingHere, setBillingHere] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [payment, setPayment] = useState<(typeof PAYMENTS)[number]>('CASH')
  const [cash, setCash] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ number: string; total: number; change: number } | null>(null)
  const [error, setError] = useState('')
  const [typedCode, setTypedCode] = useState('')

  const beeps = useBeeps()
  const busyRef = useRef(false)

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [lines]
  )
  const quantity = useMemo(() => lines.reduce((n, line) => n + line.quantity, 0), [lines])

  // ---------------------------------------------------------------- pairing
  const join = useCallback(
    async (payload: { token?: string; code?: string }) => {
      setJoining(true)
      setJoinError('')
      try {
        const joined = await bridgeApi.join({
          ...payload,
          device: /iPhone|iPad/.test(navigator.userAgent) ? 'iPhone' : 'Phone',
        })
        // The shop login lets this phone complete a bill; the bridge token is
        // what identifies the pairing itself.
        localStorage.setItem('token', joined.shopToken)
        setToken(joined.bridgeToken)
        setCanBill(joined.canBill)
        setBillingHere(joined.mode === 'PHONE_BILL')
        setJoining(false)
        setScanning(true)
      } catch (err) {
        setJoining(false)
        setJoinError(getErrorMessage(err))
      }
    },
    []
  )

  useEffect(() => {
    if (tokenParam) void join({ token: tokenParam })
    else if (codeParam) void join({ code: codeParam })
    else setJoining(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The desk can flip the mode at any time (for example, back to the counter).
  useEffect(() => {
    if (!token) return
    const timer = window.setInterval(() => {
      bridgeApi
        .state(token)
        .then((state) => {
          if (!state.active) {
            setEnded(true)
            setScanning(false)
            return
          }
          // The desk is the boss: if the cashier took the bill back, follow it.
          setBillingHere(state.mode === 'PHONE_BILL')
        })
        .catch(() => undefined)
    }, 6000)
    return () => window.clearInterval(timer)
  }, [token])

  // ---------------------------------------------------------------- cart mirror
  const pushCart = useCallback(
    (next: PhoneLine[]) => {
      if (!token) return
      const body = {
        total: next.reduce((sum, line) => sum + line.price * line.quantity, 0),
        quantity: next.reduce((sum, line) => sum + line.quantity, 0),
        lines: next.map((line) => ({
          productId: line.productId,
          name: line.name,
          price: line.price,
          quantity: line.quantity,
        })),
      }
      void bridgeApi.cart(token, body).catch(() => undefined)
    },
    [token]
  )

  const addToCart = useCallback(
    (result: BridgeScanResult) => {
      if (!result.productId || !result.name || result.price === null) return
      setLines((prev) => {
        const existing = prev.find((line) => line.productId === result.productId)
        let next: PhoneLine[]
        if (existing) {
          if (existing.quantity >= (result.stock ?? existing.stock)) return prev
          next = prev.map((line) =>
            line.productId === result.productId ? { ...line, quantity: line.quantity + 1 } : line
          )
        } else {
          next = [
            ...prev,
            {
              productId: result.productId as number,
              name: result.name as string,
              price: result.price as number,
              quantity: 1,
              stock: result.stock ?? 99,
            },
          ]
        }
        return next
      })
    },
    []
  )

  // Keep the desk mirror in step with this phone's bill, on every change.
  useEffect(() => {
    if (!token) return
    pushCart(lines)
  }, [lines, token, pushCart])

  // ---------------------------------------------------------------- scanning
  const handleCode = useCallback(
    async (raw: string) => {
      if (!token || busyRef.current || ended) return
      busyRef.current = true
      try {
        const result = await bridgeApi.scan(token, raw)
        setLast(result)
        if (result.ok) {
          beeps.ok()
          if (billingHere) addToCart(result)
        } else {
          beeps.fail()
        }
      } catch {
        beeps.fail()
        setError('Could not reach the counter. Move closer to the Wi-Fi.')
      } finally {
        window.setTimeout(() => {
          busyRef.current = false
        }, 300)
      }
    },
    [addToCart, beeps, billingHere, ended, token]
  )

  // ---------------------------------------------------------------- billing here
  const toggleBillingHere = async () => {
    if (!canBill) return
    const next = !billingHere
    setBillingHere(next)
    setError('')
    try {
      const state = await bridgeApi.setPhoneMode(token, next ? 'PHONE_BILL' : 'BILLING')
      setBillingHere(state.mode === 'PHONE_BILL')
    } catch {
      setBillingHere(!next)
    }
  }

  const changeQuantity = (productId: number, delta: number) => {
    setLines((prev) =>
      prev
        .map((line) =>
          line.productId === productId
            ? { ...line, quantity: Math.max(0, Math.min(line.stock, line.quantity + delta)) }
            : line
        )
        .filter((line) => line.quantity > 0)
    )
  }

  const charge = async () => {
    if (lines.length === 0 || busy) return
    setBusy(true)
    setError('')
    try {
      const bill = await billingApi.create({
        paymentMethod: payment,
        cashGiven: payment === 'CASH' && cash ? Number(cash) : undefined,
        items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
      })
      const paid = Number(bill.total)
      setDone({
        number: bill.billNumber,
        total: paid,
        change: payment === 'CASH' && cash ? Number(cash) - paid : 0,
      })
      setPayOpen(false)
      setLines([])
      pushCart([])
      setLast(null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  // ---------------------------------------------------------------- render
  if (joining) {
    return (
      <Centered>
        <Loader2 className="h-7 w-7 animate-spin text-green-600" />
        <p className="text-sm text-gray-600">Pairing with the counter...</p>
      </Centered>
    )
  }

  if (!token) {
    return (
      <CodeEntry
        value={typedCode}
        onChange={setTypedCode}
        busy={joining}
        error={joinError}
        onSubmit={() => void join({ code: typedCode })}
      />
    )
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900">Bill {done.number}</p>
          <p className="text-3xl font-extrabold text-green-700">{formatINR(done.total)}</p>
          {done.change > 0 && (
            <p className="mt-1 text-sm font-semibold text-amber-700">
              Change to give {formatINR(done.change)}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">Saved on the shop computer.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDone(null)
            setCash('')
            setScanning(true)
          }}
          className="rounded-xl bg-green-600 px-6 py-3 text-base font-bold text-white"
        >
          Next customer
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${ended ? 'bg-red-500' : 'bg-green-500'}`}
            />
            <span className="text-sm font-semibold text-gray-900">
              {ended ? 'Pairing ended' : 'Connected to counter'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Close"
            className="rounded-full p-2 text-gray-500 active:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-0.5 text-xs text-gray-500">
          {billingHere ? 'Bill is being made on this phone' : 'Scans go to the laptop bill'}
        </p>
      </header>

      {ended && (
        <div className="mx-4 mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          The counter started a new pairing. Scan the QR on the laptop again.
        </div>
      )}

      {error && (
        <div className="mx-4 mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
      )}

      {last && !scanning && (
        <div
          className={`mx-4 mt-4 rounded-xl px-4 py-3 ${
            last.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
          }`}
        >
          <p className="text-sm font-semibold">{last.ok ? last.name : 'Not added'}</p>
          <p className="text-xs">{last.ok ? formatINR(last.price ?? 0) : last.message}</p>
        </div>
      )}

      {billingHere && (
        <div className="mx-4 mt-4">
          {lines.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500">
              Scan packets to build the bill on this phone.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
              {lines.map((line) => (
                <li key={line.productId} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{line.name}</p>
                    <p className="text-xs text-gray-500">{formatINR(line.price)} each</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => changeQuantity(line.productId, -1)}
                      aria-label="Less"
                      className="h-9 w-9 rounded-lg border border-gray-300 text-gray-600"
                    >
                      <span className="text-lg leading-none">-</span>
                    </button>
                    <span className="w-6 text-center text-sm font-bold">{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => changeQuantity(line.productId, 1)}
                      aria-label="More"
                      className="h-9 w-9 rounded-lg border border-gray-300 text-gray-600"
                    >
                      <span className="text-lg leading-none">+</span>
                    </button>
                  </div>
                  <span className="w-20 text-right text-sm font-bold text-gray-900">
                    {formatINR(line.price * line.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setScanning(true)}
          disabled={ended}
          className="flex items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 text-sm font-bold text-white active:bg-green-700 disabled:bg-gray-300"
        >
          <ScanLine className="h-5 w-5" />
          Scan
        </button>
        <button
          type="button"
          onClick={() => void toggleBillingHere()}
          disabled={!canBill}
          className={`flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold disabled:opacity-40 ${
            billingHere ? 'bg-gray-900 text-white' : 'border border-gray-300 bg-white text-gray-700'
          }`}
        >
          <ShoppingBag className="h-5 w-5" />
          {billingHere ? 'On this phone' : 'Bill on phone'}
        </button>
      </div>

      {!canBill && (
        <p className="mx-4 mt-2 text-xs text-gray-500">
          This pairing belongs to a non-billing login. Scans still reach the laptop.
        </p>
      )}

      {billingHere && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white px-4 pb-safe pt-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">{quantity} item{quantity === 1 ? '' : 's'}</p>
              <p className="text-2xl font-extrabold text-gray-900">{formatINR(total)}</p>
            </div>
            <button
              type="button"
              onClick={() => setPayOpen(true)}
              disabled={lines.length === 0}
              className="rounded-xl bg-green-600 px-6 py-3 text-base font-bold text-white disabled:bg-gray-300"
            >
              Charge
            </button>
          </div>
        </div>
      )}

      {scanning && !ended && (
        <Suspense fallback={null}>
          <CameraScanner
            continuous
            silent
            onCode={(code) => void handleCode(code)}
            onClose={() => setScanning(false)}
            title={billingHere ? 'Scan for this bill' : 'Scan for the counter'}
          />
        </Suspense>
      )}

      {/* Result banner while the camera is full screen */}
      {scanning && last && (
        <div className="pointer-events-none fixed inset-x-3 top-16 z-[70]">
          <div
            className={`rounded-2xl px-4 py-3 text-center shadow-lg ${
              last.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            <p className="text-sm font-bold">{last.ok ? last.name : last.message}</p>
            {last.ok && <p className="text-xs opacity-90">{formatINR(last.price ?? 0)}</p>}
          </div>
        </div>
      )}

      {scanning && billingHere && lines.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex justify-center">
          <span className="rounded-full bg-black/70 px-4 py-2 text-sm font-bold text-white">
            {quantity} items - {formatINR(total)}
          </span>
        </div>
      )}

      {payOpen && (
        <div className="fixed inset-0 z-[80] flex items-end bg-black/40" onClick={() => setPayOpen(false)}>
          <div
            className="w-full rounded-t-2xl bg-white p-5 pb-safe"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Payment</h2>
              <button type="button" onClick={() => setPayOpen(false)} aria-label="Close" className="p-1 text-gray-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {PAYMENTS.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPayment(method)}
                  className={`rounded-lg py-3 text-sm font-semibold ${
                    payment === method ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
            {payment === 'CASH' && (
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-gray-600">Cash received</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={cash}
                  onChange={(event) => setCash(event.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-green-600"
                />
                {Number(cash) > total && (
                  <p className="mt-1 text-sm font-semibold text-green-700">
                    Change {formatINR(Number(cash) - total)}
                  </p>
                )}
              </div>
            )}
            <div className="mb-4 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
              <span className="text-sm font-medium text-gray-600">Total</span>
              <span className="text-xl font-extrabold text-gray-900">{formatINR(total)}</span>
            </div>
            <button
              type="button"
              onClick={() => void charge()}
              disabled={busy}
              className="w-full rounded-xl bg-green-600 py-3.5 text-base font-bold text-white disabled:bg-gray-300"
            >
              {busy ? 'Saving...' : 'Complete bill'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-6">
      {children}
    </div>
  )
}

function CodeEntry({
  value,
  onChange,
  onSubmit,
  busy,
  error,
}: {
  value: string
  onChange: (next: string) => void
  onSubmit: () => void
  busy: boolean
  error: string
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 px-6 pb-8 pt-10">
      <div className="flex items-center gap-2 text-gray-900">
        <Smartphone className="h-5 w-5 text-green-600" />
        <h1 className="text-lg font-bold">Connect to the counter</h1>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        Type the six-digit code shown on the laptop, or scan the QR code with the camera.
      </p>

      <div className="mt-6 flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3">
        <input
          type="tel"
          inputMode="numeric"
          maxLength={6}
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          className="w-full bg-transparent text-center text-3xl font-bold tracking-[0.3em] text-gray-900 outline-none"
        />
        {value.length > 0 && (
          <button type="button" onClick={() => onChange('')} aria-label="Clear" className="text-gray-400">
            <Delete className="h-5 w-5" />
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={onSubmit}
        disabled={busy || value.length !== 6}
        className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 text-base font-bold text-white disabled:bg-gray-300"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wifi className="h-5 w-5" />}
        Connect
      </button>

      <div className="mt-auto flex items-start gap-2 rounded-xl bg-white px-4 py-3 text-xs text-gray-500">
        <Receipt className="mt-0.5 h-4 w-4 shrink-0" />
        Bills are saved on the shop computer, not on this phone.
      </div>
    </div>
  )
}
