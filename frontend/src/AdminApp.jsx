import { useState, useEffect } from 'react'
import { AdminLogin } from './components/AdminLogin'
import { AdminDashboard } from './components/AdminDashboard'

const API_BASE = '/api'

export default function AdminApp() {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      setLoading(false)
      return
    }
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then(data => setAdmin(data))
      .catch(() => localStorage.removeItem('admin_token'))
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    setAdmin(null)
  }

  const handleLoginSuccess = (adminData) => {
    setAdmin(adminData)
  }

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loader" />
        <p>Проверка авторизации...</p>
      </div>
    )
  }

  if (admin) {
    return <AdminDashboard admin={admin} onLogout={handleLogout} />
  }

  return <AdminLogin onSuccess={handleLoginSuccess} />
}
