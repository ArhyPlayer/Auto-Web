import { useState, useEffect } from 'react'
import { AdminServicesTable } from './AdminServicesTable'
import { AdminStatsModal } from './AdminStatsModal'
import { AdminLeadsTable } from './AdminLeadsTable'

const API_BASE = '/api'

export function AdminDashboard({ admin, onLogout }) {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [statsOpen, setStatsOpen] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/leads`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => setLeads(Array.isArray(data) ? data : []))
      .catch(() => setLeads([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Админ-панель</h1>
        <div className="admin-header-actions">
          <button type="button" className="admin-btn-stats" onClick={() => setStatsOpen(true)}>
            Статистика
          </button>
          <div className="admin-user">
            <span>{admin?.username}</span>
            <button type="button" className="admin-btn-logout" onClick={onLogout}>
              Выйти
            </button>
          </div>
        </div>
      </header>
      {statsOpen && <AdminStatsModal onClose={() => setStatsOpen(false)} />}
      <main className="admin-main">
        <AdminServicesTable />
        <h2 className="admin-section-title">Заявки</h2>
        <AdminLeadsTable leads={leads} loading={loading} />
      </main>
    </div>
  )
}
