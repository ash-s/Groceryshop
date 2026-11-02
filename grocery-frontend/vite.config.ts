import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const keyPath = path.join(here, 'certs', 'key.pem')
const certPath = path.join(here, 'certs', 'cert.pem')

// Phone cameras only work in a secure context. When certs/ exists the dev
// server runs on https://<lan-ip>:5173 so a phone on the same Wi-Fi can scan.
// Without the folder it silently falls back to plain http.
const https =
  fs.existsSync(keyPath) && fs.existsSync(certPath)
    ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
    : undefined

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    https,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        // The dev server now runs on https for phone-camera support, but Spring's
        // CORS allowlist only knows the http origins. The browser request is
        // same-origin through the proxy, so presenting the localhost origin to
        // the backend is safe and keeps the API reachable.
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('origin', 'http://localhost:5173')
            proxyReq.setHeader('referer', 'http://localhost:5173/')
          })
        },
      },
    },
  },
})
