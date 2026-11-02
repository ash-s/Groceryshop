import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface PaginationProps {
  page: number
  totalPages: number
  total: number
  from: number
  to: number
  onPage: (page: number) => void
  /** Noun for the count line, e.g. "products". */
  itemLabel?: string
}

/** A compact page window like 1 … 4 5 6 … 20. */
function pageWindow(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const wanted = new Set<number>([1, total, current, current - 1, current + 1])
  const sorted = [...wanted].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const out: (number | '…')[] = []
  let prev = 0
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push('…')
    out.push(p)
    prev = p
  }
  return out
}

export default function Pagination({
  page,
  totalPages,
  total,
  from,
  to,
  onPage,
  itemLabel = 'items',
}: PaginationProps) {
  if (total === 0) return null

  const btn =
    'inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-gray-200 px-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
      <p className="text-xs text-gray-500">
        Showing <b className="text-gray-700">{from}</b>–<b className="text-gray-700">{to}</b> of{' '}
        <b className="text-gray-700">{total}</b> {itemLabel}
      </p>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPage(page - 1)}
            disabled={page <= 1}
            className={btn}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {pageWindow(page, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`gap-${i}`} className="px-1 text-gray-400">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPage(p)}
                className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm font-medium ${
                  p === page
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onPage(page + 1)}
            disabled={page >= totalPages}
            className={btn}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
