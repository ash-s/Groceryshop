import { useEffect, useRef } from 'react'

/**
 * USB / Bluetooth barcode scanners act as a keyboard wedge: they "type" the
 * code very fast and press Enter. This hook collects those keystrokes when the
 * focus is not inside a text box (the cashier tapped a tile or a button) and
 * hands the burst to `onScan`, so scanning still works without touching a field.
 *
 * Ordinary typing is ignored: a burst only counts when every key arrives within
 * 60 ms of the previous one and Enter follows within 300 ms — far faster than a
 * person types, so nothing is guessed from what a human types.
 */
export default function useKeyboardWedge(
  onScan: (code: string) => void,
  enabled = true
) {
  const cbRef = useRef(onScan)
  cbRef.current = onScan

  useEffect(() => {
    if (!enabled) return

    const FAST_GAP_MS = 60
    const ENTER_MS = 300

    let buffer = ''
    let lastKeyAt = 0

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      const editable =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!target?.isContentEditable
      const now = Date.now()

      if (e.key === 'Enter') {
        const code = buffer.trim()
        const fastEnough = buffer.length > 0 && now - lastKeyAt <= ENTER_MS
        buffer = ''
        // Editable fields own their own Enter handling (see ScanInput / search).
        if (editable || !fastEnough || code.length < 4) return
        e.preventDefault()
        cbRef.current(code)
        return
      }

      if (e.key.length !== 1) {
        buffer = ''
        return
      }
      if (editable) {
        buffer = ''
        return
      }
      // Reset unless this key arrived as fast as a scanner sends them.
      if (!buffer || now - lastKeyAt > FAST_GAP_MS) buffer = ''
      buffer += e.key
      lastKeyAt = now
      if (buffer.length > 64) buffer = buffer.slice(-64)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
