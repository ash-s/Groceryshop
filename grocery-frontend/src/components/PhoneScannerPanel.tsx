import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Check, Copy, RefreshCw, Smartphone, Wifi, X } from 'lucide-react'
import { useBridgeSession } from '../hooks/useBridge'

/**
 * The QR the cashier shows once per phone.
 *
 * The QR carries the pairing token in its link, so the phone lands straight on
 * its scanner - no address to type, no login screen, no IP to remember.
 */
export default function PhoneScannerPanel({
  onClose,
  embedded = false,
}: {
  onClose?: () => void
  embedded?: boolean
}) {
  const { session, error, create } = useBridgeSession(true)
  const [qr, setQr] = useState('')
  const [lan, setLan] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!session?.phoneUrl) {
      setQr('')
      return
    }
    void QRCode.toDataURL(session.phoneUrl, {
      margin: 1,
      width: 360,
      color: { dark: '#0f172a', light: '#ffffff' },
    }).then(setQr)
  }, [session?.phoneUrl])

  useEffect(() => {
    fetch('/api/device/address')
      .then((r) => r.json())
      .then((data: { lanIp: string | null }) => setLan(data.lanIp))
      .catch(() => undefined)
  }, [])

  const copyCode = async () => {
    if (!session?.code) return
    try {
      await navigator.clipboard.writeText(session.code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked; the code is on screen anyway */
    }
  }

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-green-600" />
          <div>
            <h3 className="text-base font-semibold text-gray-900">Phone scanner</h3>
            <p className="text-xs text-gray-500">Scan with the phone camera - no typing.</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {!session && !error && (
        <p className="mt-4 text-sm text-gray-500">Preparing the pairing code...</p>
      )}

      {session && !session.phoneUrl && (
        <p className="mt-4 text-sm text-amber-700">
          This computer is not on the shop Wi-Fi yet, so the phone cannot reach it.
          Connect the laptop to the Wi-Fi and open this panel again.
        </p>
      )}

      {session && qr && (
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="shrink-0 self-center rounded-xl border border-gray-200 bg-white p-2">
            <img src={qr} alt="Scan to open the phone scanner" className="h-40 w-40" />
          </div>
          <div className="min-w-0 space-y-3 text-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Pairing code</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-mono text-2xl font-bold tracking-[0.25em] text-gray-900">
                  {session.code}
                </span>
                <button
                  type="button"
                  onClick={() => void copyCode()}
                  className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
                  aria-label="Copy pairing code"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <ol className="list-decimal space-y-1 pl-4 text-gray-600">
              <li>Join the shop Wi-Fi on the phone.</li>
              <li>Point the phone camera at this code.</li>
              <li>Tap the link - the scanner opens.</li>
            </ol>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  session.phoneConnected
                    ? 'bg-green-50 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    session.phoneConnected ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                />
                {session.phoneConnected
                  ? `Connected${session.phoneLabel ? ` (${session.phoneLabel})` : ''}`
                  : 'Waiting for phone'}
              </span>
              <button
                type="button"
                onClick={() => void create()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 hover:text-green-800"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                New code
              </button>
            </div>

            <p className="flex items-center gap-1.5 text-xs text-gray-500">
              <Wifi className="h-3.5 w-3.5" />
              {lan ?? 'shop network'}
            </p>
          </div>
        </div>
      )}
    </>
  )

  if (embedded) {
    return <div className="rounded-xl border border-gray-200 bg-white p-5">{body}</div>
  }

  return (
    <div
      className="fixed inset-0 z-[55] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-t-2xl bg-white p-5 sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {body}
      </div>
    </div>
  )
}
