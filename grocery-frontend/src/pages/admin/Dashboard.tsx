import { useState } from 'react'
import { formatINR } from '../../lib/format'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Loader2,
  Package,
  Receipt,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useProducts, useLowStockProducts } from '../../hooks/useCatalog'
import { useAllOrders } from '../../hooks/useOrders'
import { useUsers } from '../../hooks/useUsers'
import { useBills, useSalesReport } from '../../hooks/useBilling'
import { downloadSalesCsv, downloadSalesPdf } from '../../lib/exportReport'
import type { Bill, SalesReport } from '../../types'

const ORDER_STATUS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-sky-100 text-sky-700',
  OUT_FOR_DELIVERY: 'bg-violet-100 text-violet-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

const PAYMENT_COLORS: Record<string, string> = {
  CASH: '#16a34a',
  CARD: '#0284c7',
  UPI: '#7c3aed',
  OTHER: '#9ca3af',
}

function StatCard({
  label,
  value,
  icon,
  to,
  gradient,
}: {
  label: string
  value: number | string
  icon: ReactNode
  to?: string
  gradient: string
}) {
  const inner = (
    <>
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <div className="text-4xl font-bold tracking-tight">{typeof value === 'number' ? value.toLocaleString() : value}</div>
          <div className="mt-1.5 text-xs font-medium uppercase tracking-wider text-white/80">{label}</div>
        </div>
        <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
          {icon}
        </div>
      </div>
      <div className="pointer-events-none absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-white/10 transition group-hover:scale-125" />
      <div className="pointer-events-none absolute -bottom-3 -right-3 h-14 w-14 rounded-full bg-white/10" />
    </>
  )

  if (!to) {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-lg`}>
        {inner}
      </div>
    )
  }

  return (
    <Link
      to={to}
      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl`}
    >
      {inner}
    </Link>
  )
}

function SalesBars({ report }: { report?: SalesReport }) {
  const data = report?.daily ?? []
  const max = Math.max(1, ...data.map((d) => d.total))
  const W = 600
  const H = 175
  const pad = 4
  const bw = (W - pad * 2) / Math.max(data.length, 1)
  const barW = Math.min(bw * 0.55, 34)
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {data.map((d, i) => {
        const hgt = d.total > 0 ? Math.max(6, (d.total / max) * (H - 48)) : 2
        const x = pad + i * bw + (bw - barW) / 2
        return (
          <g key={d.date}>
            <title>{`${d.date}: ${formatINR(d.total)} (${d.billCount} bills)`}</title>
            <rect
              x={x}
              y={H - 22 - hgt}
              width={barW}
              height={hgt}
              rx={4}
              className={
                d.total > 0
                  ? d.date === today
                    ? 'fill-green-700'
                    : 'fill-green-500'
                  : 'fill-gray-100'
              }
            />
            <text x={pad + i * bw + bw / 2} y={H - 8} textAnchor="middle" className="fill-gray-400" fontSize={9}>
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function ReportCard({ bills }: { bills?: Bill[] }) {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly')
  const [downloading, setDownloading] = useState(false)
  const { data: report } = useSalesReport(period)

  const canDownload = !!report && (report.daily?.length ?? 0) > 0

  const handlePdf = async () => {
    if (!report) return
    setDownloading(true)
    try {
      await downloadSalesPdf(report, bills ?? [], period)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
          <BarChart3 className="h-4 w-4" /> Sales Report
        </h3>
        <div className="flex rounded-lg bg-gray-100 p-0.5">
          {(['weekly', 'monthly'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition ${
                period === p ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-lg bg-green-50 px-3 py-1.5 text-sm text-green-700">
          Total <b className="text-base">{formatINR(report?.totalSales ?? 0)}</b>
        </span>
        <span className="rounded-lg bg-gray-50 px-3 py-1.5 text-sm text-gray-600">
          Bills <b className="text-base">{report?.billCount ?? 0}</b>
        </span>
        <span className="rounded-lg bg-gray-50 px-3 py-1.5 text-sm text-gray-600">
          Items <b className="text-base">{report?.itemsSold ?? 0}</b>
        </span>
        <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
          Profit <b className="text-base">{formatINR(report?.totalProfit ?? 0)}</b>
        </span>
      </div>

      <SalesBars report={report} />

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-4">
        <span className="mr-auto text-xs text-gray-400">Download this report</span>
        <button
          onClick={() => report && downloadSalesCsv(report, bills ?? [], period)}
          disabled={!canDownload}
          className="inline-flex items-center gap-1.5 rounded-md border border-green-200 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-40"
        >
          <FileSpreadsheet className="h-4 w-4" /> Excel (CSV)
        </button>
        <button
          onClick={handlePdf}
          disabled={!canDownload || downloading}
          className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
        >
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {downloading ? 'Preparing…' : 'PDF'}
        </button>
      </div>
    </div>
  )
}

function PaymentDonut({ bills }: { bills?: Bill[] }) {
  const counts = { CASH: 0, CARD: 0, UPI: 0, OTHER: 0 }
  bills?.forEach((b) => {
    const m = (b.paymentMethod ?? 'OTHER').toUpperCase()
    if (m in counts) counts[m as keyof typeof counts]++
    else counts.OTHER++
  })
  const total = bills?.length ?? 0
  const R = 42
  const C = 2 * Math.PI * R
  const segments = (Object.keys(counts) as (keyof typeof counts)[])
    .map((k) => ({ key: k, count: counts[k], color: PAYMENT_COLORS[k] ?? '#9ca3af' }))
    .filter((s) => s.count > 0)
  let offset = 0

  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0">
        <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
          <circle cx="60" cy="60" r={R} fill="none" stroke="#f3f4f6" strokeWidth="14" />
          {segments.map((s) => {
            const len = total > 0 ? (s.count / total) * C : 0
            const el = (
              <circle
                key={s.key}
                cx="60"
                cy="60"
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth="14"
                strokeDasharray={`${Math.max(len - 2, 0)} ${C - Math.max(len - 2, 0)}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
              />
            )
            offset += len
            return el
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-gray-900">{total}</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-2 text-sm">
            <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
            <span className="text-gray-500">{s.key}</span>
            <span className="ml-auto font-bold text-gray-900">{s.count}</span>
          </div>
        ))}
        {total === 0 && <div className="text-sm text-gray-400">No sales yet</div>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data: products } = useProducts()
  const { data: lowStock } = useLowStockProducts()
  const { data: orders } = useAllOrders()
  const { data: users } = useUsers()
  const { data: bills } = useBills()

  const staffCount = users?.length ?? 0
  const salesTotal = bills?.reduce((s, b) => s + b.total, 0) ?? 0
  const profitTotal =
    bills?.reduce((sum, b) => {
      const cost = (b.items ?? []).reduce(
        (c, it) => c + Number(it.costPrice ?? 0) * it.quantity,
        0
      )
      return sum + b.total - cost
    }, 0) ?? 0

  // Expired products plus anything expiring within the next two months (60 days).
  const expiringSoon = (products ?? [])
    .flatMap((p) => {
      if (!p.expiryDate) return []
      const days = Math.ceil((Date.parse(p.expiryDate) - Date.now()) / 86400000)
      return days <= 60 ? [{ name: p.name, days }] : []
    })
    .sort((a, b) => a.days - b.days)

  const stats = [
    { label: 'Products', value: products?.length ?? 0, icon: <Package className="h-6 w-6" />, to: '/admin/products', gradient: 'from-emerald-500 to-teal-600' },
    { label: 'Total Sales', value: formatINR(salesTotal), icon: <Wallet className="h-6 w-6" />, gradient: 'from-sky-500 to-blue-600' },
    { label: 'Profit', value: formatINR(profitTotal), icon: <TrendingUp className="h-6 w-6" />, gradient: 'from-rose-500 to-pink-600' },
    { label: 'Low Stock', value: lowStock?.length ?? 0, icon: <AlertTriangle className="h-6 w-6" />, to: '/admin/stock', gradient: 'from-amber-500 to-orange-600' },
    { label: 'Staff', value: staffCount, icon: <Users className="h-6 w-6" />, to: '/admin/staff', gradient: 'from-violet-500 to-purple-600' },
  ]

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Expiry alert: already expired or expiring within 2 months */}
      {expiringSoon.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {expiringSoon.length} product{expiringSoon.length === 1 ? '' : 's'} expired or
                expiring within 2 months
              </p>
              <p className="mt-1 text-xs text-amber-800">
                {expiringSoon
                  .slice(0, 4)
                  .map((x) => `${x.name} (${x.days < 0 ? 'expired' : `${x.days}d`})`)
                  .join(' · ')}
                {expiringSoon.length > 4 ? ` · +${expiringSoon.length - 4} more` : ''}
              </p>
              <Link
                to="/admin/products"
                className="mt-1 inline-block text-xs font-semibold text-amber-900 underline"
              >
                Review products and update expiry dates
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Sales report + payment split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3"><ReportCard bills={bills} /></div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
            <CreditCard className="h-4 w-4" /> Payments
          </h3>
          <PaymentDonut bills={bills} />
        </div>
      </div>

      {/* Low stock + recent bills */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
              <AlertTriangle className="h-4 w-4" /> Low Stock
            </h3>
            <Link to="/admin/stock" className="text-sm font-medium text-green-600 hover:text-green-700">View →</Link>
          </div>
          {lowStock && lowStock.length > 0 ? (
            <div className="space-y-4">
              {lowStock.slice(0, 6).map((product) => {
                const pct = product.minStock > 0 ? Math.min(100, (product.stock / product.minStock) * 100) : 100
                const bar = pct <= 50 ? 'bg-gradient-to-r from-red-500 to-red-400' : 'bg-gradient-to-r from-amber-500 to-amber-400'
                return (
                  <div key={product.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="truncate font-medium text-gray-900">{product.name}</span>
                      <span className="ml-2 whitespace-nowrap text-gray-400">{product.stock}/{product.minStock}</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
              <CheckCircle2 className="h-5 w-5 text-green-500" /> All stocked up
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
            <Receipt className="h-4 w-4" /> Recent Bills
          </h3>
          {bills && bills.length > 0 ? (
            <div className="space-y-1">
              {bills.slice(0, 6).map((bill) => (
                <div key={bill.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-gray-50">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">
                    {(bill.customerName || bill.staffName || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-gray-900">
                      {bill.customerName || 'Walk-in'}
                    </div>
                    <div className="text-xs text-gray-400">{bill.billNumber}</div>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                    {bill.paymentMethod || '—'}
                  </span>
                  <span className="w-20 text-right font-bold text-gray-900">{formatINR(bill.total)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-gray-400">No bills yet</div>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
            <Truck className="h-4 w-4" /> Recent Orders
          </h3>
          <Link to="/admin/orders" className="text-sm font-medium text-green-600 hover:text-green-700">View →</Link>
        </div>
        {orders && orders.length > 0 ? (
          <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
            {orders.slice(0, 8).map((order) => (
              <div key={order.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-gray-50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">
                  {(order.customerName || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-gray-900">{order.customerName}</div>
                  <div className="text-xs text-gray-400">{order.orderNumber}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ORDER_STATUS[order.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {order.status.replace(/_/g, ' ')}
                </span>
                <span className="w-20 text-right font-bold text-gray-900">{formatINR(order.total)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-gray-400">No orders yet</div>
        )}
      </div>
    </div>
  )
}