import { ShieldCheck } from 'lucide-react'
import PhoneScannerPanel from './PhoneScannerPanel'

/**
 * Settings view of the phone link.
 *
 * Shows the same pairing code the Billing screen shows, plus the one-time
 * certificate note. Nothing here is stored: the laptop reports its own Wi-Fi
 * address and the QR carries it, so there is no IP to type.
 */
export default function PhoneConnect() {
  return (
    <div className="space-y-3">
      <PhoneScannerPanel embedded />
      <p className="flex items-start gap-1.5 px-1 text-xs text-gray-500">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        First time on a phone, the browser shows a security notice. Tap Advanced,
        then Proceed. This is normal for a shop that runs entirely on its own
        computer.
      </p>
    </div>
  )
}
