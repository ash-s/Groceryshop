import { useEffect, useMemo, useState } from 'react'

/**
 * Client-side pagination for long tables.
 *
 * Pass the already-filtered list plus a `resetKey` (e.g. the search term) so the
 * view jumps back to page 1 whenever the filter changes. The page is also
 * clamped when the list shrinks. The returned object spreads straight into
 * <Pagination /> — extra fields like `pageItems` are ignored there.
 */
export function usePagination<T>(items: T[], pageSize = 10, resetKey?: string | number) {
  const [page, setPage] = useState(1)

  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(page, totalPages)

  // Go back to the first page when the filter/search changes.
  useEffect(() => {
    setPage(1)
  }, [resetKey, pageSize])

  // Stay in range if the list shrinks (e.g. a row was deleted).
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageItems = useMemo(
    () => items.slice((current - 1) * pageSize, current * pageSize),
    [items, current, pageSize]
  )

  return {
    page: current,
    totalPages,
    total,
    from: total === 0 ? 0 : (current - 1) * pageSize + 1,
    to: Math.min(current * pageSize, total),
    pageItems,
    onPage: setPage,
  }
}
