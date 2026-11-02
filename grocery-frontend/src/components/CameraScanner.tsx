import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { AlertTriangle, Camera, Check, Keyboard, RefreshCw, X } from 'lucide-react'

/** Ignore the same code for this long so holding an item up does not add it repeatedly. */
const DUPLICATE_GRACE_MS = 1600

interface CameraScannerProps {
  /** Called with the decoded text of every recognised code (after de-duplication). */
  onCode: (code: string) => void
  onClose: () => void
  title?: string
  /** Keep decoding after a read instead of stopping. Used by the phone scanner. */
  continuous?: boolean
  /** Skip the scanner's own beep/haptic; the parent gives the feedback. */
  silent?: boolean
  /** Ignore the same code for this long (defaults are tuned per mode). */
  duplicateGraceMs?: number
}

/**
 * Full-screen camera scanner (Paytm-style beam animation).
 * - The camera stream is released on close, on unmount and before every restart.
 * - Beep + white flash + haptic feedback on every successful read.
 * - Manual code entry for scanners without a working camera.
 */
export default function CameraScanner({
  onCode,
  onClose,
  title = 'Scan barcode',
  continuous = false,
  silent = false,
  duplicateGraceMs,
}: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const lastCodeRef = useRef<string>('')
  const lastAtRef = useRef<number>(0)
  const onCodeRef = useRef(onCode)
  const facingModeRef = useRef<'environment' | 'user'>('environment')
  const audioCtxRef = useRef<AudioContext | null>(null)
  const isMobileRef = useRef(false)
  /** False the moment this scanner is closed/unmounted, so nothing restarts. */
  const aliveRef = useRef(true)
  /** Bumped on every start; a stale start never installs its controls. */
  const startIdRef = useRef(0)
  const detectedRef = useRef(false)
  onCodeRef.current = onCode

  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(true)
  const [hasStream, setHasStream] = useState(false)
  const [lastCode, setLastCode] = useState<string | null>(null)
  const [manual, setManual] = useState('')
  const [flash, setFlash] = useState(false)
  const [found, setFound] = useState(false)

  /** Releases the camera without touching React state (safe during unmount). */
  const stopCamera = useCallback(() => {
    try {
      controlsRef.current?.stop()
    } catch {
      /* already released */
    }
    controlsRef.current = null
  }, [])

  useEffect(() => {
    isMobileRef.current = /Mobi|Android|iPhone|iPad|iPod/.test(navigator.userAgent)
  }, [])

  const playScanBeep = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioCtxRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 1200
      gain.gain.value = 0.15
      osc.connect(gain).connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.06)
    } catch {
      /* audio not allowed */
    }
  }, [])

  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) navigator.vibrate(30)
  }, [])

  const acceptCode = useCallback(
    (text: string) => {
      setLastCode(text)
      setFlash(true)
      window.setTimeout(() => setFlash(false), 160)
      if (!silent) {
        playScanBeep()
        triggerHaptic()
      }
      if (continuous) {
        // Stay live: the phone is held over a shelf, not one packet at a time.
        onCodeRef.current(text)
        return
      }
      detectedRef.current = true
      stopCamera()
      setFound(true)
      onCodeRef.current(text)
    },
    [continuous, playScanBeep, silent, stopCamera, triggerHaptic]
  )

  const startCamera = useCallback(
    async (facingMode: 'environment' | 'user', relaxed = false) => {
      const startId = ++startIdRef.current
      stopCamera()
      facingModeRef.current = facingMode
      detectedRef.current = false
      setFound(false)
      setStarting(true)
      setError(null)
      setHasStream(false)

      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera needs a secure page — open the app on localhost or HTTPS.')
        setStarting(false)
        return
      }

      const isMobile = isMobileRef.current
      // Only ever prefer a resolution — never require one. A `min` here would be a
      // hard floor, and any camera that reports less than it (laptop webcams,
      // 640x480 devices, some phone cameras) would reject the whole request.
      // `ideal` is a hint, so the scanner opens on every camera we hand it.
      const size = isMobile
        ? { width: { ideal: 1280 }, height: { ideal: 720 } }
        : { width: { ideal: 1920 }, height: { ideal: 1080 } }
      // `exact` fails on cameras that do not report a facing (most webcams), so a
      // relaxed retry without facingMode runs when the first attempt is rejected.
      const videoConstraints = relaxed
        ? size
        : { facingMode: { exact: facingMode }, ...size }

      const formats = isMobile
        ? [
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
            BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E,
            BarcodeFormat.CODE_128,
            BarcodeFormat.CODE_39,
            BarcodeFormat.QR_CODE,
          ]
        : [
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
            BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E,
            BarcodeFormat.CODE_128,
            BarcodeFormat.CODE_39,
            BarcodeFormat.CODE_93,
            BarcodeFormat.ITF,
            BarcodeFormat.CODABAR,
            BarcodeFormat.QR_CODE,
            BarcodeFormat.DATA_MATRIX,
            BarcodeFormat.PDF_417,
            BarcodeFormat.AZTEC,
          ]

      const hints = new Map<DecodeHintType, unknown>()
      hints.set(DecodeHintType.POSSIBLE_FORMATS, formats)
      hints.set(DecodeHintType.TRY_HARDER, !isMobile)
      hints.set(DecodeHintType.PURE_BARCODE, false)

      const reader = new BrowserMultiFormatReader(hints as never)

      try {
        const controls = await reader.decodeFromConstraints(
          { video: videoConstraints },
          videoRef.current as HTMLVideoElement,
          (result) => {
            if (!result || detectedRef.current) return
            const text = (result.getText() ?? '').replace(/[\s\r\n]+/g, '')
            if (!text) return

            const now = Date.now()
            const grace = duplicateGraceMs ?? (continuous ? 2500 : DUPLICATE_GRACE_MS)
            if (text === lastCodeRef.current && now - lastAtRef.current < grace) return
            lastCodeRef.current = text
            lastAtRef.current = now

            // Stop decoding immediately: one barcode can only be added once.
            acceptCode(text)
          }
        )

        // The scanner was closed while the camera was still opening — release it
        // straight away so no camera keeps running in the background.
        if (!aliveRef.current || startId !== startIdRef.current) {
          try {
            controls.stop()
          } catch {
            /* already released */
          }
          return
        }

        controlsRef.current = controls
        if (detectedRef.current) {
          try {
            controls.stop()
          } catch {
            /* already released */
          }
          controlsRef.current = null
        } else {
          setHasStream(true)
        }
      } catch (err) {
        const name = (err as { name?: string })?.name ?? ''
        if (aliveRef.current && startId === startIdRef.current) {
          if (!relaxed && name === 'OverconstrainedError') {
            // Facing mode not supported by this camera — retry without it.
            window.setTimeout(() => {
              if (aliveRef.current && startId === startIdRef.current) void startCamera(facingMode, true)
            }, 0)
            return
          }
          setError(cameraErrorMessage(err))
        }
      } finally {
        if (aliveRef.current && startId === startIdRef.current) setStarting(false)
      }
    },
    [acceptCode, duplicateGraceMs, stopCamera]
  )

  useEffect(() => {
    aliveRef.current = true
    void startCamera('environment')
    return () => {
      aliveRef.current = false
      startIdRef.current += 1
      stopCamera()
    }
  }, [startCamera, stopCamera])

  /** If the parent keeps us open (unknown code), resume scanning after a beat. */
  useEffect(() => {
    if (!found) return
    const timer = window.setTimeout(() => {
      if (!aliveRef.current) return
      void startCamera(facingModeRef.current)
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [found, startCamera])

  const switchCamera = () => {
    const next = facingModeRef.current === 'environment' ? 'user' : 'environment'
    void startCamera(next)
  }

  const handleVideoTouch = (e: React.TouchEvent) => {
    const video = videoRef.current
    if (!video || !('focusMode' in video)) return
    const rect = video.getBoundingClientRect()
    const x = (e.touches[0].clientX - rect.left) / rect.width
    const y = (e.touches[0].clientY - rect.top) / rect.height
    try {
      ;(video as any).focusMode = 'continuous'
      ;(video as any).focusPointOfInterest = { x, y }
    } catch {
      /* not supported */
    }
  }

  const submitManual = (e: React.SyntheticEvent) => {
    e.preventDefault()
    const code = manual.trim().replace(/[\s\r\n]+/g, '')
    if (!code) return
    setLastCode(code)
    setFlash(true)
    window.setTimeout(() => setFlash(false), 160)
    setManual('')
    if (continuous) {
      onCodeRef.current(code)
      return
    }
    if (!silent) {
      playScanBeep()
      triggerHaptic()
    }
    // Release the camera before handing over - the parent closes the scanner.
    stopCamera()
    onCodeRef.current(code)
    onClose()
  }

  const close = () => {
    stopCamera()
    onClose()
  }

  const live = hasStream && !error && !starting

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-black pb-safe">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        muted
        autoPlay
        style={{ transform: facingModeRef.current === 'user' ? 'scaleX(-1)' : 'none' }}
        onTouchStart={handleVideoTouch}
      />

      {/* Top readability gradient + bar */}
      <div className="relative z-10 bg-gradient-to-b from-black/85 to-transparent pb-8">
        <div className="flex items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-2 text-white">
            <Camera className="h-5 w-5 text-green-400" />
            <h2 className="text-sm font-semibold">{title}</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={switchCamera}
              aria-label="Switch camera"
              className="rounded-full bg-white/10 p-2.5 text-white active:bg-white/20"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={close}
              aria-label="Close scanner"
              className="rounded-full bg-white/10 p-2.5 text-white active:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Scan frame */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6">
        {live && (
          <div className="relative w-full max-w-[380px]">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-green-400/40 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
              {/* Beam with glow trail */}
              <div className="scan-beam pointer-events-none absolute left-0 right-0 h-0.5" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.10),transparent_65%)]" />
              {/* Corner brackets */}
              <div className="scan-bracket absolute left-0 top-0 h-8 w-8 rounded-tl-2xl border-l-[3px] border-t-[3px] border-green-400" />
              <div className="scan-bracket absolute right-0 top-0 h-8 w-8 rounded-tr-2xl border-r-[3px] border-t-[3px] border-green-400" />
              <div className="scan-bracket absolute bottom-0 left-0 h-8 w-8 rounded-bl-2xl border-b-[3px] border-l-[3px] border-green-400" />
              <div className="scan-bracket absolute bottom-0 right-0 h-8 w-8 rounded-br-2xl border-b-[3px] border-r-[3px] border-green-400" />
              {flash && <div className="scan-flash pointer-events-none absolute inset-0" />}
            </div>
            <p className="mt-4 text-center text-sm text-green-100/90">Point at the barcode</p>
          </div>
        )}

        {starting && !error && (
          <div className="flex flex-col items-center gap-3 text-gray-200">
            <span className="h-9 w-9 animate-spin rounded-full border-2 border-green-400 border-t-transparent" />
            <span className="text-sm">Starting camera…</span>
          </div>
        )}

        {error && (
          <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl bg-black/70 px-6 py-6 text-center">
            <AlertTriangle className="h-9 w-9 text-amber-400" />
            <p className="text-sm text-gray-100">{error}</p>
            <button
              type="button"
              onClick={switchCamera}
              className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white active:bg-green-700"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {lastCode && !continuous && (
        <div className="relative z-10 flex justify-center pb-2">
          <span className="inline-flex max-w-[90%] items-center gap-2 rounded-full bg-green-500 px-4 py-2 text-sm font-semibold text-white shadow-lg animate-bounce-in">
            <Check className="h-4 w-4 shrink-0" />
            <span className="truncate">{lastCode}</span>
          </span>
        </div>
      )}

      {/* Manual entry */}
      <form onSubmit={submitManual} className="relative z-10 bg-black/90 px-3 pb-4 pt-3">
        <div className="flex items-center gap-2">
          <Keyboard className="h-5 w-5 shrink-0 text-gray-400" />
          <input
            type="text"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Type the code"
            className="h-12 flex-1 rounded-lg border border-gray-700 bg-gray-900 px-4 text-base text-white outline-none placeholder:text-gray-500 focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            disabled={!manual.trim()}
            className="h-12 shrink-0 rounded-lg bg-green-600 px-5 text-base font-semibold text-white active:bg-green-700 disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </form>
    </div>,
    document.body
  )
}

function cameraErrorMessage(err: unknown): string {
  const name = (err as { name?: string })?.name ?? ''
  const message = (err as Error)?.message ?? ''

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return 'Camera permission denied. Allow camera access in browser settings, then reopen.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera found. Type the product code below instead.'
  }
  if (name === 'OverconstrainedError') {
    return 'Camera not available. Try switching camera.'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Camera in use by another app. Close it and reopen scanner.'
  }
  if (name === 'AbortError' || name === 'TypeError') {
    return 'Could not open camera. Type the product code below instead.'
  }
  return message ? `Camera error: ${message}` : 'Could not start camera. Type the code below.'
}
