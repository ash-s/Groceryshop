import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Info, KeyRound, Trash2 } from 'lucide-react'
import { adminUserApi } from '../../api/users'
import { useUsers } from '../../hooks/useUsers'
import { getErrorMessage } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import PasswordInput from '../../components/PasswordInput'
import type { AdminResetPasswordResponse, User } from '../../types'

export default function StaffManagement() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const { data: users, isLoading } = useUsers()
  const [showAdd, setShowAdd] = useState(false)
  const [resetting, setResetting] = useState<User | null>(null)
  const [search, setSearch] = useState('')

  const filtered = users?.filter((u) =>
    (u.fullName + ' ' + u.username + ' ' + u.email + ' ' + (u.phone ?? ''))
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] })

  const handleDelete = async (user: User) => {
    if (!confirm(`Delete ${user.fullName} (@${user.username})? This cannot be undone.`)) return
    try {
      await adminUserApi.delete(user.id)
      refresh()
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  const handleRoleChange = async (user: User, role: 'STAFF' | 'ADMIN') => {
    const toLabel = role === 'ADMIN' ? 'an admin' : 'a staff member'
    if (!confirm(`Change ${user.fullName} (@${user.username}) to ${toLabel}?`)) return
    try {
      await adminUserApi.updateRole(user.id, role)
      refresh()
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  if (isLoading) return <div className="text-center py-16">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Staff Members</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 font-medium"
        >
          + Add Staff
        </button>
      </div>

      <input
        type="text"
        placeholder="Search by name, username, email or phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm px-3 py-2 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
      />

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Staff</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Phone</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Role</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Joined</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered?.map((user) => {
              const isSelf = currentUser?.id === user.id
              return (
                <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{user.fullName}</div>
                    <div className="text-xs text-gray-500">
                      @{user.username}
                      {isSelf && <span className="ml-1 text-green-600">(you)</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3 text-gray-600">{user.phone || '-'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        user.role === 'ADMIN'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {!isSelf && (
                      <>
                        {user.role === 'STAFF' ? (
                          <button
                            onClick={() => handleRoleChange(user, 'ADMIN')}
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 mr-3"
                            title="Promote this staff member to admin"
                          >
                            <ArrowUp className="h-4 w-4" />
                            Make Admin
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRoleChange(user, 'STAFF')}
                            className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 mr-3"
                            title="Make this admin a staff member"
                          >
                            <ArrowDown className="h-4 w-4" />
                            Make Staff
                          </button>
                        )}
                        <button
                          onClick={() => setResetting(user)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 mr-3"
                          title="Reset password"
                        >
                          <KeyRound className="h-4 w-4" />
                          Reset Password
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="text-red-500 hover:text-red-600"
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtered && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  No staff found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AddStaffForm
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false)
            refresh()
          }}
        />
      )}

      {resetting && (
        <ResetPasswordModal
          user={resetting}
          onClose={() => setResetting(null)}
        />
      )}
    </div>
  )
}

function AddStaffForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    role: 'STAFF' as 'STAFF' | 'ADMIN',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await adminUserApi.create(form)
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Add Staff Member</h3>
        <p className="text-sm text-gray-500 mb-4">
          The password you enter is the temporary password the staff member will use to log in.
        </p>

        {error && <div className="mb-4 px-4 py-2 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name *</label>
            <input
              required
              maxLength={100}
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
            <input
              required
              minLength={3}
              maxLength={50}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              required
              type="email"
              maxLength={100}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              maxLength={20}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as 'STAFF' | 'ADMIN' })}
              className={inputClass}
            >
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Temporary password *</label>
            <PasswordInput
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 6 characters"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-600 border hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50">
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ResetPasswordModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [mode, setMode] = useState<'generate' | 'custom'>('generate')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AdminResetPasswordResponse | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (mode === 'custom') {
      if (newPassword.length < 6) {
        setError('New password must be at least 6 characters.')
        return
      }
      if (newPassword !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }
    }

    setLoading(true)
    try {
      const res = await adminUserApi.resetPassword(
        user.id,
        mode === 'custom' ? { newPassword } : {}
      )
      setResult(res)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const copyTemp = async () => {
    if (!result?.temporaryPassword) return
    try {
      await navigator.clipboard.writeText(result.temporaryPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Reset Password</h3>
        <p className="text-sm text-gray-500 mb-4">
          {user.fullName} (@{user.username})
        </p>

        {error && <div className="mb-4 px-4 py-2 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>}

        {result ? (
          <div className="space-y-4">
            <div className="px-4 py-3 rounded-md bg-green-50 text-green-800 text-sm">{result.message}</div>

            {result.temporaryPassword ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-800 mb-2">
                  <Info className="inline h-4 w-4 mr-1 -mt-0.5" />
                  Share this temporary password with the staff member:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-md bg-white border border-gray-200 font-mono text-base text-gray-900 break-all">
                    {result.temporaryPassword}
                  </code>
                  <button
                    type="button"
                    onClick={copyTemp}
                    className="px-3 py-2 rounded-md text-sm text-white bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  They can log in with it and change it immediately. The password is not shown anywhere else.
                </p>
              </div>
            ) : (
              <div className="rounded-md bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600">
                The new password has been set. Share it with the staff member.
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="flex gap-3 mb-4">
              <button
                type="button"
                onClick={() => setMode('generate')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium border ${
                  mode === 'generate'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Generate temporary password
              </button>
              <button
                type="button"
                onClick={() => setMode('custom')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium border ${
                  mode === 'custom'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Set custom password
              </button>
            </div>

            {mode === 'generate' ? (
              <p className="mb-4 px-4 py-3 rounded-md bg-blue-50 text-blue-800 text-sm">
                A random temporary password will be generated and shown to you once — share it with the
                staff member verbally or securely.
              </p>
            ) : (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New password *</label>
                  <PasswordInput
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password *</label>
                  <PasswordInput
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter the new password"
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-600 border hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}