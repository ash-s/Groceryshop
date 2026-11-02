import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { cashApi } from '../../api/cash'
import { useCashCount, useSaveCashCount } from '../../hooks/useCustomers'
import { getErrorMessage } from '../../api/auth'
import { formatINR } from '../../lib/format'

type Counts = {
  n500: number
  n200: number
  n100: number
  n50: number
  n20: number
  n10: number
  n5: number
  n2: number
  n1: number
}

const EMPTY: Counts = { n500: 0, n200: 0, n100: 0, n50: 0, n20: 0, n10: 0, n5: 0, n2: 0, n1: 0 }

/** Denominations counted at day end (₹2000 is intentionally not counted). */
const DENOMS: { key: keyof Counts; value: number }[] = [
  { key: 'n500', value: 500 },
  { key: 'n200', value: 200 },
  { key: 'n100', value: 100 },
  { key: 'n50', value: 50 },
  { key: 'n20', value: 20 },
  { key: 'n10', value: 10 },
  { key: 'n5', value: 5 },
  { key: 'n2', value: 2 },
  { key: 'n1', value: 1 },
]

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function CashReconciliation() {
  const [date, setDate] = useState(todayIso())
  const { data, isLoading } = useCashCount(date)
  const save = useSaveCashCount()
  const { data: recent } = useQuery({ queryKey: ['cash-recent'], queryFn: cashApi.recent })

  const [counts, setCounts] = useState<Counts>(EMPTY)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [historyView, setHistoryView] = useState<'list' | 'breakdown'>('list')

  useEffect(() => {
    if (data) {
      setCounts({
        n500: data.n500,
        n200: data.n200,
        n100: data.n100,
        n50: data.n50,
        n20: data.n20,
        n10: data.n10,
        n5: data.n5,
        n2: data.n2,
        n1: data.n1,
      })
    }
  }, [data])

  const total = DENOMS.reduce((sum, d) => sum + d.value * (counts[d.key] || 0), 0)
  const expected = data?.expected ?? 0
  const difference = total - expected

  const setCount = (key: keyof Counts, raw: string) => {
    setSaved(false)
    setCounts((prev) => ({ ...prev, [key]: Math.max(0, Math.trunc(Number(raw) || 0)) }))
  }

  const handleSave = async () => {
    setError('')
    try {
      await save.mutateAsync({ date, ...counts })
      setSaved(true)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  if (isLoading) return <div className="text-center py-16 text-gray-500">Loading…</div>

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">End-of-Day Cash Count</h2>
          <p className="text-sm text-gray-500">Count the notes and coins in the till and compare with cash sales.</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {error && <div className="mb-4 px-4 py-2 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>}
      {saved && <div className="mb-4 px-4 py-2 rounded-md bg-green-50 text-green-700 text-sm">Count saved.</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-3 py-3 font-semibold text-gray-700 sm:px-4">Note / Coin</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700 sm:px-4">Count</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-700 sm:px-4">Amount</th>
              </tr>
            </thead>
            <tbody>
              {DENOMS.map((d) => (
                <tr key={d.key} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{formatINR(d.value)}</td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number"
                      min="0"
                      value={counts[d.key] || ''}
                      placeholder="0"
                      onChange={(e) => setCount(d.key, e.target.value)}
                      className="w-20 px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 sm:w-24"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-800">
                    {formatINR(d.value * (counts[d.key] || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4">
          <div className="bg-green-50 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-800">Counted total</span>
              <span className="text-2xl font-bold text-green-700">{formatINR(total)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-green-800">
              <span>Expected (cash sales)</span>
              <span className="font-semibold">{formatINR(expected)}</span>
            </div>
            <div
              className={`flex items-center justify-between border-t border-green-200 pt-2 text-sm font-semibold ${
                difference === 0 ? 'text-green-800' : difference > 0 ? 'text-amber-700' : 'text-red-700'
              }`}
            >
              <span>{difference < 0 ? 'Short by' : difference > 0 ? 'Extra in till' : 'Balanced'}</span>
              <span className="text-lg">{difference === 0 ? formatINR(0) : formatINR(Math.abs(difference))}</span>
            </div>
            <button
              onClick={handleSave}
              disabled={save.isPending}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {save.isPending ? 'Saving…' : 'Save count'}
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="border-b px-4 py-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Cash count history (note tracking)</h3>
              <select
                value={historyView}
                onChange={(e) => setHistoryView(e.target.value as 'list' | 'breakdown')}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="list">Summary list</option>
                <option value="breakdown">Full denomination breakdown</option>
              </select>
            </div>
            <div className="overflow-x-auto table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Date</th>
                    {historyView === 'breakdown' ? (
                      <>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">₹500</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">₹200</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">₹100</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">₹50</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">₹20</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">₹10</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">₹5</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">₹2</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">₹1</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">Counted</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">Expected</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">Diff</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {recent?.map((c) => {
                    const denoms = c.denominations ?? DENOMS.map((d) => {
                      const key = `n${d.value}` as keyof typeof c
                      const count = Number(c[key] ?? 0)
                      return {
                        value: d.value,
                        count,
                        amount: d.value * count,
                      }
                    })
                    return historyView === 'breakdown' ? (
                      <tr key={c.date} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-700">{c.date}</td>
                        {denoms.map((d) => (
                          <td key={d.value} className="px-4 py-2 text-right text-gray-900">
                            {d.count} ({formatINR(d.amount)})
                          </td>
                        ))}
                      </tr>
                    ) : (
                      <tr key={c.date} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-700">{c.date}</td>
                        <td className="px-4 py-2 text-right font-medium text-gray-900">{formatINR(c.total)}</td>
                        <td className="px-4 py-2 text-right text-gray-600">{formatINR(c.expected)}</td>
                        <td
                          className={`px-4 py-2 text-right font-semibold ${
                            c.difference === 0 ? 'text-green-700' : c.difference > 0 ? 'text-amber-700' : 'text-red-700'
                          }`}
                        >
                          {c.difference === 0 ? '—' : c.difference > 0 ? `+${formatINR(c.difference)}` : `-${formatINR(Math.abs(c.difference))}`}
                        </td>
                      </tr>
                    )
                  })}
                  {recent?.length === 0 && (
                    <tr>
                      <td colSpan={historyView === 'breakdown' ? 10 : 4} className="px-4 py-6 text-center text-gray-500">
                        No counts yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
