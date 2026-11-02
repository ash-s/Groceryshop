import { useEffect, useState, type FormEvent } from 'react'
import { Check, Copy, ExternalLink, Gift, MessageCircle, Phone, Send } from 'lucide-react'
import { settingsApi } from '../../api/settings'
import { getErrorMessage } from '../../api/auth'
import PhoneConnect from '../../components/PhoneConnect'

const TEMPLATE_BODY =
  'GroceryShop alert {{1}}: LOW STOCK - {{2}} (code {{3}}), only {{4}} left, minimum {{5}}. Price {{6}}. Supplier: {{7}}. {{8}}'

export default function Settings() {
  // WhatsApp alert number
  const [phone, setPhone] = useState('')
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [phoneMsg, setPhoneMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [loadError, setLoadError] = useState('')

  // Meta Cloud API (real alerts)
  const [metaEnabled, setMetaEnabled] = useState(false)
  const [metaToken, setMetaToken] = useState('')
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState('')
  const [metaTemplateName, setMetaTemplateName] = useState('grocery_shop_restock_alert')
  const [copied, setCopied] = useState(false)

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
      .catch((err) => setLoadError(getErrorMessage(err)))
  }, [])

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

  return (
    <div className="space-y-6">
      <PhoneConnect />
      <div className="rounded-xl bg-white shadow-sm p-4">
        <h2 className="text-base font-bold text-gray-900">Low-stock alerts</h2>
        <p className="mt-1 text-xs text-gray-500">
          Alerts fire when stock drops to its minimum. With a Meta token they reach the owner&apos;s
          WhatsApp and each product&apos;s supplier; without one they print to the backend console only.
        </p>
        {loadError && (
          <p className="mt-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Couldn&apos;t load saved settings: {loadError}
          </p>
        )}
      </div>

      <form onSubmit={handleSaveSettings} className="rounded-xl bg-white shadow-sm p-4 space-y-4">
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
            1,000 free conversations per month. Enter your token and phone number ID below, then turn
            on real alerts. Left off, alerts are
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
              In Business Manager open WhatsApp Manager → Message templates: category Utility,
              language English (en), body above. The name must match the field exactly.
            </p>
          </div>
        </div>

        {phoneMsg && (
          <p className={`text-sm ${phoneMsg.ok ? 'text-green-600' : 'text-red-600'}`}>{phoneMsg.text}</p>
        )}
      </form>

      <LoyaltySettingsCard />
    </div>
  )
}

function LoyaltySettingsCard() {
  const [loyalty, setLoyalty] = useState({ enabled: true, pointsPerHundred: 1, pointValue: 1 })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    settingsApi
      .getLoyalty()
      .then(setLoyalty)
      .catch((err) => setMsg({ ok: false, text: getErrorMessage(err) }))
  }, [])

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const saved = await settingsApi.updateLoyalty(loyalty)
      setLoyalty(saved)
      setMsg({ ok: true, text: 'Loyalty settings saved.' })
    } catch (err) {
      setMsg({ ok: false, text: getErrorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="rounded-xl bg-white shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Gift className="h-5 w-5 text-green-600" />
        <h2 className="text-base font-bold text-gray-900">Loyalty points</h2>
      </div>
      <p className="text-xs text-gray-500">
        Customers earn points on every bill and can spend them as a discount at billing.
        With default rates a ₹100 bill earns 1 point worth ₹1 off.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Points per ₹100 spent</label>
          <input
            type="number"
            min="0"
            value={loyalty.pointsPerHundred}
            onChange={(e) => setLoyalty({ ...loyalty, pointsPerHundred: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">₹ off per point redeemed</label>
          <input
            type="number"
            min="0"
            value={loyalty.pointValue}
            onChange={(e) => setLoyalty({ ...loyalty, pointValue: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={loyalty.enabled}
              onChange={(e) => setLoyalty({ ...loyalty, enabled: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            Loyalty on
          </label>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-md text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Loyalty'}
        </button>
        {msg && <p className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>}
      </div>
    </form>
  )
}