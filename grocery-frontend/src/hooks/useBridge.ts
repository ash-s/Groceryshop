import { useCallback, useEffect, useRef, useState } from 'react'
import { bridgeApi, type BridgeCart, type BridgeScanResult, type BridgeSessionView } from '../api/bridge'
import type { Bill } from '../types'

const SESSION_KEY = 'bridge.sessionId'

/**
 * One pairing per browser tab, shared by every panel on the page.
 *
 * The desk screen and the Settings screen both show the same code; without this
 * they would each mint their own and the phone would pair with the wrong one.
 */
let cached: BridgeSessionView | null = null
let inflight: Promise<void> | null = null
const listeners = new Set<(session: BridgeSessionView | null) => void>()

function publish(session: BridgeSessionView | null) {
  cached = session
  listeners.forEach((listener) => listener(session))
}

async function loadOrCreate(): Promise<void> {
  if (cached) return
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY)
      if (stored) {
        try {
          publish(await bridgeApi.getSession(stored))
          return
        } catch {
          sessionStorage.removeItem(SESSION_KEY)
        }
      }
      const created = await bridgeApi.createSession()
      sessionStorage.setItem(SESSION_KEY, created.id)
      publish(created)
    } catch {
      /* the panel shows the empty state */
    } finally {
      inflight = null
    }
  })()
  return inflight
}

/**
 * One pairing per browser tab. Reloading the desk keeps the same session, so a
 * phone that is already paired stays paired.
 */
export function useBridgeSession(enabled = true) {
  const [session, setSession] = useState<BridgeSessionView | null>(cached)
  const [error, setError] = useState('')

  useEffect(() => {
    listeners.add(setSession)
    setSession(cached)
    return () => {
      listeners.delete(setSession)
    }
  }, [])

  useEffect(() => {
    if (enabled) void loadOrCreate()
  }, [enabled])

  const create = useCallback(async () => {
    try {
      const next = await bridgeApi.createSession()
      sessionStorage.setItem(SESSION_KEY, next.id)
      publish(next)
      setError('')
    } catch {
      setError('Could not start the phone link.')
    }
  }, [])

  // Keep the "phone connected" dot honest while the panel is open.
  useEffect(() => {
    if (!enabled) return
    const timer = window.setInterval(() => {
      const id = cached?.id
      if (!id) return
      bridgeApi
        .getSession(id)
        .then(publish)
        .catch(() => undefined)
    }, 8000)
    return () => window.clearInterval(timer)
  }, [enabled])

  const setMode = useCallback(async (mode: string) => {
    const id = cached?.id
    if (!id) return
    try {
      publish(await bridgeApi.setMode(id, mode))
    } catch {
      /* the stream will re-sync */
    }
  }, [])

  return { session, error, create, setMode }
}

interface StreamHandlers {
  onScan?: (result: BridgeScanResult) => void
  onCart?: (cart: BridgeCart) => void
  onBill?: (bill: Bill) => void
  onState?: (state: { mode: string; phoneConnected: boolean; phoneLabel?: string }) => void
}

/**
 * Server-sent events over POST-free HTTP. Uses fetch (not EventSource) so the
 * normal Bearer token is sent, then reconnects with backoff if the shop Wi-Fi
 * blinks. One connection per desk screen.
 */
export function useBridgeStream(sessionId: string | undefined, handlers: StreamHandlers) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (!sessionId) return
    const controller = new AbortController()
    let closed = false
    let attempt = 0

    const dispatch = (raw: string) => {
      let event = 'message'
      const dataLines: string[] = []
      for (const line of raw.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
      }
      if (dataLines.length === 0) return
      let payload: unknown
      try {
        payload = JSON.parse(dataLines.join('\n'))
      } catch {
        return
      }
      if (event === 'scan') handlersRef.current.onScan?.(payload as BridgeScanResult)
      else if (event === 'cart') handlersRef.current.onCart?.(payload as BridgeCart)
      else if (event === 'bill') handlersRef.current.onBill?.(payload as Bill)
      else if (event === 'state') {
        handlersRef.current.onState?.(
          payload as { mode: string; phoneConnected: boolean; phoneLabel?: string }
        )
      }
    }

    const run = async () => {
      while (!closed) {
        try {
          const token = localStorage.getItem('token')
          const res = await fetch(
            `/api/bridge/events?sessionId=${encodeURIComponent(sessionId)}`,
            {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
              signal: controller.signal,
              cache: 'no-store',
            }
          )
          if (!res.ok || !res.body) throw new Error(String(res.status))
          attempt = 0
          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''
          for (;;) {
            const { value, done } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            let split = buffer.indexOf('\n\n')
            while (split >= 0) {
              const chunk = buffer.slice(0, split)
              buffer = buffer.slice(split + 2)
              if (chunk.trim()) dispatch(chunk)
              split = buffer.indexOf('\n\n')
            }
          }
        } catch {
          /* fall through to retry */
        }
        if (closed) return
        attempt += 1
        await new Promise((resolve) => window.setTimeout(resolve, Math.min(5000, 400 * attempt)))
      }
    }

    void run()
    return () => {
      closed = true
      controller.abort()
    }
  }, [sessionId])
}
