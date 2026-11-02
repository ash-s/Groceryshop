import { useEffect, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowUp,
  CalendarCheck,
  Info,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { adminUserApi } from '../../api/users'
import { staffApi } from '../../api/staff'
import { useUsers } from '../../hooks/useUsers'
import { getErrorMessage } from '../../api/auth'
import { formatINR } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import PasswordInput from '../../components/PasswordInput'
import Pagination from '../../components/Pagination'
import { usePagination } from '../../hooks/usePagination'
import type {
  AdminResetPasswordResponse,
  AttendanceRow,
  SalarySummary,
  User,
} from '../../types'

type StaffTab = 'staff' | 'attendance' | 'salary'

function todayIso() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

function currentMonth() {
  return todayIso().slice(0, 7)
}

export default function StaffManagement() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const { data: users, isLoading } = useUsers()
  const [showAdd, setShowAdd] = useState(false)
  const [resetting, setResetting] = useState<User | null>(null)
  const [salaryTarget, setSalaryTarget] = useState<User | null>(null)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<StaffTab>('staff')

  const filtered = users?.filter((u) =>
    (u.fullName + ' ' + u.username + ' ' + u.email + ' ' + (u.phone ?? ''))
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const pager = usePagination(filtered ?? [], 10, search)

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
      <div className="mb-6 flex items-center justify-end">
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700"
        >
          <Plus className="h-4 w-4" />
          Add Staff
        </button>
      </div>

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1">
        {([
          ['staff', 'Staff', Users],
          ['attendance', 'Attendance', CalendarCheck],
          ['salary', 'Salary', Wallet],
        ] as const).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition sm:px-4 ${
              tab === value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'staff' && (
        <>
      <input
        type="text"
        placeholder="Search by name, username, email or phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm px-3 py-2 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
      />

      <div className="bg-white rounded-xl shadow-sm overflow-hidden table-scroll table-scroll-wide">
        <table className="hidden w-full text-sm lg:table">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Staff</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Phone</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Role</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Joined</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Salary</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pager.pageItems.map((user) => {
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
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setSalaryTarget(user)}
                      className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-green-700"
                      title="Set monthly salary"
                    >
                      {user.monthlySalary != null ? formatINR(user.monthlySalary) : 'Set salary'}
                      <Pencil className="h-3.5 w-3.5 text-gray-400" />
                    </button>
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
                <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                  No staff found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination {...pager} itemLabel="staff" />
      </div>

      {/* Phone view: one card per staff member instead of a 7-column table. */}
      <div className="space-y-3 lg:hidden">
        {pager.pageItems.map((user) => {
          const isSelf = currentUser?.id === user.id
          return (
            <div
              key={user.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">
                    {user.fullName}
                    {isSelf && <span className="ml-1 text-xs text-green-600">(you)</span>}
                  </p>
                  <p className="text-xs text-gray-500">@{user.username}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    user.role === 'ADMIN'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {user.role}
                </span>
              </div>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="shrink-0 text-gray-500">Email</dt>
                  <dd className="truncate text-right text-gray-700">{user.email}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="shrink-0 text-gray-500">Phone</dt>
                  <dd className="text-right text-gray-700">{user.phone || '-'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="shrink-0 text-gray-500">Joined</dt>
                  <dd className="text-right text-gray-700">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="shrink-0 text-gray-500">Salary</dt>
                  <dd className="text-right">
                    <button
                      type="button"
                      onClick={() => setSalaryTarget(user)}
                      className="inline-flex items-center gap-1 font-medium text-gray-700"
                    >
                      {user.monthlySalary != null ? formatINR(user.monthlySalary) : 'Set salary'}
                      <Pencil className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                  </dd>
                </div>
              </dl>
              {!isSelf && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                  <button
                    onClick={() =>
                      handleRoleChange(user, user.role === 'STAFF' ? 'ADMIN' : 'STAFF')
                    }
                    className={`inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm font-medium ${
                      user.role === 'STAFF'
                        ? 'border-indigo-200 text-indigo-600'
                        : 'border-amber-200 text-amber-600'
                    }`}
                  >
                    {user.role === 'STAFF' ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )}
                    {user.role === 'STAFF' ? 'Make Admin' : 'Make Staff'}
                  </button>
                  <button
                    onClick={() => setResetting(user)}
                    className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-3 py-2 text-sm font-medium text-blue-600"
                  >
                    <KeyRound className="h-4 w-4" />
                    Reset password
                  </button>
                  <button
                    onClick={() => handleDelete(user)}
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {filtered && filtered.length === 0 && (
          <p className="rounded-xl bg-white p-6 text-center text-gray-500">No staff found.</p>
        )}
      </div>
        </>
      )}

      {tab === 'attendance' && <AttendancePanel />}
      {tab === 'salary' && <SalaryPanel />}

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

      {salaryTarget && (
        <SalaryModal
          user={salaryTarget}
          onClose={() => setSalaryTarget(null)}
          onSaved={() => {
            setSalaryTarget(null)
            refresh()
          }}
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
          This is the password the staff member logs in with.
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
                  They can change it after logging in. It is never shown again.
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

function SalaryModal({
  user,
  onClose,
  onSaved,
}: {
  user: User
  onClose: () => void
  onSaved: () => void
}) {
  const [value, setValue] = useState(
    user.monthlySalary != null ? String(user.monthlySalary) : ''
  )
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const salary = value.trim() === '' ? null : Number(value)
      await adminUserApi.updateSalary(user.id, salary)
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6">
        <h3 className="mb-1 text-lg font-bold text-gray-900">Monthly salary</h3>
        <p className="mb-4 text-sm text-gray-500">
          {user.fullName} (@{user.username})
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Salary per month (₹)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. 15000"
              className={inputClass}
            />
            <p className="mt-1 text-[11px] text-gray-400">
              Leave it empty to clear the salary.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const STATUS_OPTIONS = [
  { value: 'PRESENT', label: 'Present', active: 'border-green-600 bg-green-600 text-white' },
  { value: 'HALF_DAY', label: 'Half day', active: 'border-amber-500 bg-amber-500 text-white' },
  { value: 'LEAVE', label: 'Leave', active: 'border-sky-600 bg-sky-600 text-white' },
  { value: 'ABSENT', label: 'Absent', active: 'border-red-600 bg-red-600 text-white' },
] as const

function AttendancePanel() {
  const [date, setDate] = useState(todayIso())
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const load = async (value: string) => {
    setLoading(true)
    setError('')
    try {
      setRows(await staffApi.getAttendance(value))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(date)
  }, [date])

  const mark = async (row: AttendanceRow, status: AttendanceRow['status']) => {
    if (!status) return
    setSavingId(row.userId)
    setError('')
    const previous = rows
    setRows((prev) =>
      prev.map((item) => (item.userId === row.userId ? { ...item, status } : item))
    )
    try {
      setRows(await staffApi.markAttendance(date, [{ userId: row.userId, status }]))
    } catch (err) {
      setError(getErrorMessage(err))
      setRows(previous)
    } finally {
      setSavingId(null)
    }
  }

  const present = rows.filter((row) => row.status === 'PRESENT').length
  const marked = rows.filter((row) => row.status).length

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Date</label>
          <input
            type="date"
            value={date}
            max={todayIso()}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <p className="text-sm text-gray-500">
          {present} present · {marked} of {rows.length} marked
        </p>
      </div>

      {error && (
        <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Staff</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Mark attendance</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Current</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.userId} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{row.userName}</div>
                    <div className="text-xs text-gray-500">{row.role}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_OPTIONS.map((option) => {
                        const active = row.status === option.value
                        return (
                          <button
                            key={option.value}
                            type="button"
                            disabled={savingId === row.userId}
                            onClick={() => mark(row, option.value)}
                            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 ${
                              active
                                ? option.active
                                : 'border-gray-300 text-gray-600 hover:border-gray-400'
                            }`}
                          >
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {savingId === row.userId ? (
                      <Loader2 className="ml-auto h-4 w-4 animate-spin text-gray-400" />
                    ) : row.status ? (
                      <span className="text-xs font-semibold text-gray-700">
                        {row.status.replace('_', ' ')}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Not marked</span>
                    )}
                  </td>
                </tr>
              ))
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-gray-500">
                  No staff members.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        Click a status to save it instantly. Half day counts as 0.5.
      </p>
    </div>
  )
}

function SalaryPanel() {
  const [month, setMonth] = useState(currentMonth())
  const [rows, setRows] = useState<SalarySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paying, setPaying] = useState<SalarySummary | null>(null)

  const load = async (value: string) => {
    setLoading(true)
    setError('')
    try {
      setRows(await staffApi.getSalary(value))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(month)
  }, [month])

  const totalNet = rows.reduce((sum, row) => sum + Number(row.netPayable), 0)
  const totalPaid = rows
    .filter((row) => row.paid)
    .reduce((sum, row) => sum + Number(row.paidAmount ?? 0), 0)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <p className="text-sm text-gray-500">
          Payable {formatINR(totalNet)} · Paid {formatINR(totalPaid)}
        </p>
      </div>

      {error && (
        <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm table-scroll table-scroll-wide">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Staff</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Salary</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Attendance</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Deduction</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Bonus</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Net payable</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.userId} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{row.userName}</div>
                    <div className="text-xs text-gray-500">{row.role}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatINR(row.monthlySalary)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <div>
                      P {row.presentDays} · H {row.halfDays} · L {row.leaveDays} · A{' '}
                      {row.absentDays}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {row.workingDays} working day{row.workingDays === 1 ? '' : 's'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {formatINR(row.deductions)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatINR(row.bonus)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatINR(row.netPayable)}
                  </td>
                  <td className="px-4 py-3">
                    {row.paid ? (
                      <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                        Paid{row.paidOn ? ` ${new Date(row.paidOn).toLocaleDateString()}` : ''}
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setPaying(row)}
                      className="rounded-md border border-green-600 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-50"
                    >
                      {row.paid ? 'Update' : 'Pay'}
                    </button>
                  </td>
                </tr>
              ))
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                  No staff with a salary set. Set salaries from the Staff tab.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {paying && (
        <PaySalaryModal
          row={paying}
          month={month}
          onClose={() => setPaying(null)}
          onPaid={() => {
            setPaying(null)
            load(month)
          }}
        />
      )}
    </div>
  )
}

function PaySalaryModal({
  row,
  month,
  onClose,
  onPaid,
}: {
  row: SalarySummary
  month: string
  onClose: () => void
  onPaid: () => void
}) {
  const [bonus, setBonus] = useState(String(row.bonus ?? 0))
  const [deductions, setDeductions] = useState(String(row.deductions ?? 0))
  const [paidAmount, setPaidAmount] = useState(
    String(row.paid ? row.paidAmount ?? 0 : row.netPayable)
  )
  const [notes, setNotes] = useState(row.notes ?? '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const net = Math.max(
    0,
    Number(row.monthlySalary) - (Number(deductions) || 0) + (Number(bonus) || 0)
  )

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await staffApi.paySalary({
        userId: row.userId,
        month,
        bonus: Number(bonus) || 0,
        deductions: Number(deductions) || 0,
        paidAmount: Number(paidAmount) || 0,
        notes: notes.trim() || undefined,
      })
      onPaid()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Pay salary</h3>
            <p className="text-sm text-gray-500">
              {row.userName} · {month}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Base {formatINR(row.monthlySalary)} · attendance deduction{' '}
            {formatINR(row.computedDeductions)}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Bonus (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={bonus}
                onChange={(e) => setBonus(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Deduction (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={deductions}
                onChange={(e) => setDeductions(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Amount paid (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-sm text-gray-500">Net payable</span>
            <span className="text-lg font-bold text-green-700">{formatINR(net)}</span>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Mark paid'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}