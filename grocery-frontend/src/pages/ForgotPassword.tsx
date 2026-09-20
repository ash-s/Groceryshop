import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Check } from 'lucide-react'
import { authApi, getErrorMessage } from '../api/auth'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [resetLink, setResetLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await authApi.forgotPassword({ email })
      setResetLink(res.resetLink ?? '')
      setSent(true)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(resetLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable — user can still copy manually */
    }
  }

  if (sent) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Check your email</h1>
          <p className="text-gray-600 text-sm mb-6">
            If an account exists for <span className="font-medium text-gray-900">{email}</span>,
            we've sent a link to reset your password. The link expires in 30 minutes.
          </p>

          {resetLink && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-left">
              <p className="mb-2 text-xs font-semibold text-amber-800">
                Email is simulated — here is your reset link (also logged in the server console):
              </p>
              <div className="flex items-center gap-2">
                <a
                  href={resetLink}
                  className="min-w-0 flex-1 truncate rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-800 hover:underline"
                >
                  {resetLink}
                </a>
                <button
                  type="button"
                  onClick={copyLink}
                  className="flex shrink-0 items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          <Link to="/login" className="text-green-600 hover:text-green-700 font-medium text-sm">
            Back to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Forgot Password</h1>
        <p className="text-sm text-gray-600 text-center mb-6">
          Enter your account email and we'll send you a link to reset your password.
        </p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-md text-white bg-green-600 hover:bg-green-700 font-medium disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Remembered it?{' '}
          <Link to="/login" className="text-green-600 hover:text-green-700 font-medium">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}