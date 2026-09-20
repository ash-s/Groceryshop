import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Dashboard from './Dashboard'

/** Staff only use Billing — send them straight there. */
export default function AdminIndex() {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/admin/billing" replace />
  return <Dashboard />
}