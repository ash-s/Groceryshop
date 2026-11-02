import type { Bill, SalesReport } from '../types'
import { formatDateTime } from './format'

export type ReportPeriod = 'weekly' | 'monthly'

function periodLabel(period: ReportPeriod): string {
  return period === 'weekly' ? 'Weekly' : 'Monthly'
}

/** First and last day covered by the report (from its daily breakdown). */
function reportRange(report: SalesReport): { start: string; end: string } {
  const daily = report.daily ?? []
  return {
    start: daily[0]?.date ?? '',
    end: daily[daily.length - 1]?.date ?? '',
  }
}

/** Bills that fall inside the report's date range. */
function billsInRange(report: SalesReport, bills: Bill[]): Bill[] {
  const { start, end } = reportRange(report)
  if (!start || !end) return []
  return bills.filter((b) => {
    const day = (b.createdAt ?? '').slice(0, 10)
    return day >= start && day <= end
  })
}

function itemsInBill(bill: Bill): number {
  return (bill.items ?? []).reduce((sum, item) => sum + item.quantity, 0)
}

/** Profit of a bill = amount charged minus the buying cost of its items. */
function billProfit(bill: Bill): number {
  const cost = (bill.items ?? []).reduce(
    (sum, item) => sum + Number(item.costPrice ?? 0) * item.quantity,
    0
  )
  return Number(bill.total ?? 0) - cost
}

function itemCountByDay(report: SalesReport, bills: Bill[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const bill of billsInRange(report, bills)) {
    const day = (bill.createdAt ?? '').slice(0, 10)
    map.set(day, (map.get(day) ?? 0) + itemsInBill(bill))
  }
  return map
}

function money(value: number | string | undefined): string {
  return (Number(value ?? 0)).toFixed(2)
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function csvCell(value: string | number | null | undefined): string {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function csvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(csvCell).join(',')
}

/**
 * Downloads the sales report as a CSV file. Opens directly in Excel / Google
 * Sheets: a summary, the per-day breakdown, then every bill in the period.
 */
export function downloadSalesCsv(report: SalesReport, bills: Bill[], period: ReportPeriod) {
  const { start, end } = reportRange(report)
  const rows: string[] = []

  rows.push(csvRow(['Sales Report', periodLabel(period)]))
  rows.push(csvRow(['Generated', new Date().toLocaleString('en-IN')]))
  rows.push(csvRow(['Period', `${start} to ${end}`]))
  rows.push(csvRow(['Total Sales (INR)', money(report.totalSales)]))
  rows.push(csvRow(['Profit (INR)', money(report.totalProfit)]))
  rows.push(csvRow(['Bills', report.billCount]))
  rows.push(csvRow(['Items Sold', report.itemsSold]))
  rows.push('')

  const byDay = itemCountByDay(report, bills)
  rows.push(csvRow(['Daily Breakdown']))
  rows.push(csvRow(['Date', 'Bills', 'Items', 'Total (INR)', 'Profit (INR)']))
  for (const day of report.daily ?? []) {
    rows.push(csvRow([day.date, day.billCount, byDay.get(day.date) ?? 0, money(day.total), money(day.profit)]))
  }
  rows.push(csvRow(['Total', report.billCount, report.itemsSold, money(report.totalSales), money(report.totalProfit)]))
  rows.push('')

  rows.push(csvRow(['Bills In Period']))
  rows.push(csvRow(['Date & Time', 'Bill No', 'Customer', 'Staff', 'Payment', 'Items', 'Total (INR)', 'Profit (INR)']))
  for (const bill of billsInRange(report, bills)) {
    rows.push(
      csvRow([
        formatDateTime(bill.createdAt),
        bill.billNumber,
        bill.customerName || 'Walk-in',
        bill.staffName,
        bill.paymentMethod || '—',
        itemsInBill(bill),
        money(bill.total),
        money(billProfit(bill)),
      ])
    )
  }

  // UTF-8 BOM so Excel reads ₹ and other non-ASCII characters correctly.
  const blob = new Blob(['\uFEFF' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(`sales-report-${period}-${end || 'report'}.csv`, blob)
}

/**
 * Downloads the sales report as a real PDF (generated in the browser).
 * jsPDF is imported lazily so it is only fetched when this is actually used.
 */
export async function downloadSalesPdf(report: SalesReport, bills: Bill[], period: ReportPeriod) {
  const { jsPDF } = await import('jspdf')
  const { autoTable } = await import('jspdf-autotable')

  const { start, end } = reportRange(report)
  const inRange = billsInRange(report, bills)
  const byDay = itemCountByDay(report, bills)

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const green: [number, number, number] = [22, 163, 74]

  doc.setFontSize(17)
  doc.setTextColor(17, 24, 39)
  doc.text('GroceryShop — Sales Report', 14, 18)

  doc.setFontSize(10)
  doc.setTextColor(107, 114, 128)
  doc.text(`${periodLabel(period)}  •  ${start} to ${end}`, 14, 25)
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 30)

  doc.setFontSize(11)
  doc.setTextColor(17, 24, 39)
  doc.text(
    `Total sales: Rs ${money(report.totalSales)}      Profit: Rs ${money(report.totalProfit)}      Bills: ${report.billCount}      Items sold: ${report.itemsSold}`,
    14,
    39
  )

  autoTable(doc, {
    startY: 45,
    head: [['Date', 'Bills', 'Items', 'Total (Rs)', 'Profit (Rs)']],
    body: [
      ...(report.daily ?? []).map((day) => [
        day.date,
        String(day.billCount),
        String(byDay.get(day.date) ?? 0),
        money(day.total),
        money(day.profit),
      ]),
      ['Total', String(report.billCount), String(report.itemsSold), money(report.totalSales), money(report.totalProfit)],
    ],
    theme: 'striped',
    headStyles: { fillColor: green, textColor: 255 },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
  })

  const afterDaily =
    (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 120

  autoTable(doc, {
    startY: afterDaily + 10,
    head: [['Date & Time', 'Bill No', 'Customer', 'Staff', 'Payment', 'Items', 'Total (Rs)', 'Profit (Rs)']],
    body: inRange.map((bill) => [
      formatDateTime(bill.createdAt),
      bill.billNumber,
      bill.customerName || 'Walk-in',
      bill.staffName,
      bill.paymentMethod || '—',
      String(itemsInBill(bill)),
      money(bill.total),
      money(billProfit(bill)),
    ]),
    theme: 'striped',
    headStyles: { fillColor: green, textColor: 255 },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' } },
  })

  doc.save(`sales-report-${period}-${end || 'report'}.pdf`)
}
