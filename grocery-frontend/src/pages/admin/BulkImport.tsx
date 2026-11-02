import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, FileDown, Upload } from 'lucide-react'
import { productApi } from '../../api/catalog'
import { getErrorMessage } from '../../api/auth'
import type { BulkImportResult } from '../../types'

type Field = 'name' | 'stock' | 'price' | 'rack' | 'category' | 'code'

interface ParsedRow {
  line: number
  name: string
  price: number | null
  stock: number | null
  rack: string
  category: string
  code: string
  valid: boolean
  error: string
}

const HEADER_KEYS: Record<string, Field> = {
  name: 'name',
  product: 'name',
  productname: 'name',
  item: 'name',
  itemname: 'name',
  qty: 'stock',
  quantity: 'stock',
  stock: 'stock',
  qtyin: 'stock',
  openingstock: 'stock',
  instock: 'stock',
  price: 'price',
  mrp: 'price',
  rate: 'price',
  sellingprice: 'price',
  rack: 'rack',
  shelf: 'rack',
  location: 'rack',
  category: 'category',
  cat: 'category',
  type: 'category',
  code: 'code',
  barcode: 'code',
}

const DEFAULT_ORDER: Field[] = ['name', 'stock', 'price', 'rack', 'category', 'code']

const normKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

function splitLine(line: string, delim: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delim) {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

function detectDelimiter(lines: string[]): string {
  const sample = lines.slice(0, 5).join('\n')
  let best = ','
  let bestCount = 0
  for (const d of [',', '\t', '|', ';']) {
    const count = sample.split(d).length - 1
    if (count > bestCount) {
      bestCount = count
      best = d
    }
  }
  return best
}

function toNumber(s: string): number | null {
  if (!s) return null
  const cleaned = s.replace(/[^0-9.\-]/g, '')
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function parseRows(raw: string, delimChoice: string): { rows: ParsedRow[]; delimiter: string } {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim() !== '')
  if (lines.length === 0) return { rows: [], delimiter: ',' }

  const delimiter = delimChoice === 'auto' ? detectDelimiter(lines) : delimChoice
  const firstCells = splitLine(lines[0], delimiter)
  const mapped = firstCells.map((c) => HEADER_KEYS[normKey(c)])
  const hasHeader = mapped.includes('name') && mapped.filter(Boolean).length >= 2

  const idxMap: Partial<Record<Field, number>> = {}
  if (hasHeader) {
    firstCells.forEach((cell, i) => {
      const f = HEADER_KEYS[normKey(cell)]
      if (f && idxMap[f] === undefined) idxMap[f] = i
    })
  } else {
    DEFAULT_ORDER.forEach((f, i) => {
      idxMap[f] = i
    })
  }

  const get = (cells: string[], f: Field) => {
    const i = idxMap[f]
    return i === undefined ? '' : (cells[i] ?? '')
  }

  const dataLines = hasHeader ? lines.slice(1) : lines
  const rows: ParsedRow[] = dataLines.map((line, i) => {
    const cells = splitLine(line, delimiter)
    const name = get(cells, 'name')
    const price = toNumber(get(cells, 'price'))
    const row: ParsedRow = {
      line: i + 1,
      name,
      price,
      stock: toNumber(get(cells, 'stock')),
      rack: get(cells, 'rack'),
      category: get(cells, 'category'),
      code: get(cells, 'code'),
      valid: true,
      error: '',
    }
    if (!name) {
      row.valid = false
      row.error = 'Missing name'
    } else if (price === null || price <= 0) {
      row.valid = false
      row.error = 'Missing / invalid price'
    }
    return row
  })

  return { rows, delimiter }
}

const DELIM_LABEL: Record<string, string> = {
  ',': 'comma',
  '\t': 'tab',
  '|': 'pipe',
  ';': 'semicolon',
}

export default function BulkImport() {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [raw, setRaw] = useState('')
  const [delimiter, setDelimiter] = useState('auto')
  const [defaultMinStock, setDefaultMinStock] = useState('10')
  const [createMissingCategories, setCreateMissingCategories] = useState(true)
  const [skipExistingNames, setSkipExistingNames] = useState(true)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BulkImportResult | null>(null)

  const { rows, delimiter: usedDelimiter } = useMemo(() => parseRows(raw, delimiter), [raw, delimiter])
  const validRows = rows.filter((r) => r.valid)
  const invalidRows = rows.filter((r) => !r.valid)

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      setRaw(text)
      setFileName(file.name)
      setResult(null)
      setError('')
    } catch {
      setError('Could not read that file. Try saving it as .csv or .txt.')
    }
  }

  const handleImport = async () => {
    if (validRows.length === 0) {
      setError('Nothing to import yet — paste or load your stock list first.')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await productApi.bulkImport({
        items: validRows.map((r) => ({
          name: r.name,
          code: r.code || null,
          rack: r.rack || null,
          category: r.category || null,
          price: r.price as number,
          stock: r.stock ?? 0,
          minStock: Number(defaultMinStock) || 10,
        })),
        defaultMinStock: Number(defaultMinStock) || 10,
        createMissingCategories,
        skipExistingNames,
      })
      setResult(res)
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['low-stock'] })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const csv =
      'Name,Qty,Price,Rack,Category\n' +
      'Amul Butter 100g,50,62,A2,Dairy\n' +
      'Parle-G 250g,100,30,B1,Biscuits\n'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'stock-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <p className="text-sm text-gray-600 mb-4">
        Bring your existing stock into the app <strong>without barcodes and without Excel</strong>.
        Type or paste one product per line, or load a CSV/text file. Barcodes are optional and can be
        attached later by scanning a packet.
      </p>

      <div className="mb-4 rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-gray-700">
        <p className="font-semibold text-gray-900 mb-2">Format — one product per line</p>
        <pre className="bg-white rounded-md border border-green-200 p-3 overflow-x-auto text-xs leading-5">
{`Amul Butter 100g, 50, 62, A2, Dairy
Parle-G 250g, 100, 30, B1, Biscuits`}
        </pre>
        <p className="mt-2 text-xs text-gray-600">
          Columns: <strong>Name, Qty, Price, Rack, Category</strong> (Rack and Category optional).
          A comma, tab, pipe <span className="font-mono">|</span> or semicolon all work — the separator
          is detected automatically. A header row is optional. Barcode column, if present, can stay blank.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <button
          onClick={downloadTemplate}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-green-600 text-green-700 hover:bg-green-50 text-sm font-medium"
        >
          <FileDown className="h-4 w-4" />
          Download CSV template
        </button>
        <label className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium cursor-pointer">
          <Upload className="h-4 w-4" />
          Load a file
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            onChange={handleFile}
            className="hidden"
          />
        </label>
        {fileName && <span className="text-xs text-gray-500">loaded: {fileName}</span>}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-gray-600">Separator</span>
          <select value={delimiter} onChange={(e) => setDelimiter(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded-md bg-white text-sm">
            <option value="auto">Auto</option>
            <option value=",">Comma ,</option>
            <option value={'\t'}>Tab</option>
            <option value="|">Pipe |</option>
            <option value=";">Semicolon ;</option>
          </select>
        </div>
      </div>

      <textarea
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value)
          setResult(null)
        }}
        rows={9}
        spellCheck={false}
        placeholder={'Paste or type your stock list here, e.g.\nAmul Butter 100g, 50, 62, A2, Dairy\nParle-G 250g, 100, 30, B1, Biscuits'}
        className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-xs leading-5 focus:outline-none focus:ring-2 focus:ring-green-500"
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-sm text-gray-700">
        <label className="inline-flex items-center gap-2">
          <span>Default min stock</span>
          <input
            type="number"
            min="0"
            value={defaultMinStock}
            onChange={(e) => setDefaultMinStock(e.target.value)}
            className="w-20 px-2 py-1 border border-gray-300 rounded-md"
          />
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={createMissingCategories} onChange={(e) => setCreateMissingCategories(e.target.checked)} />
          Create categories that don't exist
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={skipExistingNames} onChange={(e) => setSkipExistingNames(e.target.checked)} />
          Skip products that already exist (by name)
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-4 mb-2">
        <button
          onClick={handleImport}
          disabled={loading || validRows.length === 0}
          className="px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 font-medium disabled:opacity-50"
        >
          {loading ? 'Importing…' : `Import ${validRows.length} product${validRows.length === 1 ? '' : 's'}`}
        </button>
        <span className="text-sm text-gray-600">
          {rows.length} row{rows.length === 1 ? '' : 's'} detected
          {rows.length > 0 && <> · separator: <span className="font-medium">{DELIM_LABEL[usedDelimiter] ?? usedDelimiter}</span></>}
          {invalidRows.length > 0 && <span className="text-red-600"> · {invalidRows.length} with problems</span>}
        </span>
      </div>

      {error && <div className="mb-4 px-4 py-2 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>}

      {result && (
        <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="flex items-center gap-2 font-semibold text-green-800">
            <CheckCircle2 className="h-5 w-5" />
            Import finished
          </p>
          <p className="mt-1 text-sm text-gray-700">
            <strong>{result.created}</strong> product{result.created === 1 ? '' : 's'} created
            {result.skipped > 0 && <> · <strong>{result.skipped}</strong> skipped (already existed)</>}
            {result.failed.length > 0 && <> · <strong className="text-red-700">{result.failed.length}</strong> not imported</>}
          </p>
          {result.createdCategories.length > 0 && (
            <p className="mt-1 text-sm text-gray-700">
              New categories created: {result.createdCategories.join(', ')}
            </p>
          )}
          {result.failed.length > 0 && (
            <div className="mt-3">
              <p className="flex items-center gap-1 text-sm font-medium text-red-700">
                <AlertTriangle className="h-4 w-4" />
                Rows that were not imported
              </p>
              <ul className="mt-1 text-xs text-red-700 list-disc list-inside max-h-40 overflow-y-auto">
                {result.failed.slice(0, 50).map((f, i) => (
                  <li key={i}>
                    Row {f.row}{f.name ? ` (${f.name})` : ''}: {f.reason}
                  </li>
                ))}
              </ul>
              {result.failed.length > 50 && <p className="text-xs text-gray-500 mt-1">…and {result.failed.length - 50} more.</p>}
            </div>
          )}
          <p className="mt-2 text-xs text-gray-500">
            Find them on the Products tab. Add or correct stock any time from the Stock tab.
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto table-scroll table-scroll-wide">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-3 py-2 font-semibold text-gray-700">#</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-700">Name</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-700">Qty</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-700">Price</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-700">Rack</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-700">Category</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-700">Problem</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((r) => (
                <tr key={r.line} className={`border-b last:border-0 ${r.valid ? '' : 'bg-red-50'}`}>
                  <td className="px-3 py-2 text-gray-400">{r.line}</td>
                  <td className="px-3 py-2 text-gray-900">{r.name || <span className="text-gray-400">—</span>}</td>
                  <td className="px-3 py-2 text-gray-600">{r.stock ?? 0}</td>
                  <td className="px-3 py-2 text-gray-600">{r.price ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{r.rack || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{r.category || '—'}</td>
                  <td className="px-3 py-2 text-red-600 text-xs">{r.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 100 && (
            <p className="px-3 py-2 text-xs text-gray-400">Showing first 100 of {rows.length} rows.</p>
          )}
        </div>
      )}
    </div>
  )
}