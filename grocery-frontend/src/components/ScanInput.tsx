import { useState, type KeyboardEvent, type RefObject } from 'react'
import { ScanLine } from 'lucide-react'

interface ScanInputProps {
  /** Called with the scanned/typed code when Enter is pressed. */
  onScan: (code: string) => void
  placeholder?: string
  autoFocus?: boolean
  /** Keep a ref so the caller can re-focus the box after an action. */
  inputRef?: RefObject<HTMLInputElement | null>
  disabled?: boolean
}

/**
 * Scan-first input for barcode / code entry. A USB or Bluetooth barcode
 * scanner is a "keyboard wedge": it types the code and presses Enter — this
 * field then fires onScan(code) with the exact scanned value.
 */
export default function ScanInput({
  onScan,
  placeholder = 'Scan barcode or type product code, press Enter…',
  autoFocus,
  inputRef,
  disabled,
}: ScanInputProps) {
  const [value, setValue] = useState('')

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const code = value.trim()
      if (!code) return
      onScan(code)
      setValue('')
    }
  }

  return (
    <div className="relative">
      <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600 pointer-events-none" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        autoComplete="off"
        className="w-full pl-9 pr-3 py-2 border border-green-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </div>
  )
}