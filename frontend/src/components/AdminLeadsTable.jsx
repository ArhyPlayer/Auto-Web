import { useState } from 'react'
import {
  scoreLead,
  getLeadTemperature,
  getLeadDepartment,
  getLeadStatus,
  sortLeadsByTemperature,
} from '../utils/leadScoring'
import { AdminLeadDetailModal } from './AdminLeadDetailModal'

const API_BASE = '/api'

function formatBudget(budget) {
  if (!budget) return '—'
  const n = parseInt(String(budget).replace(/\s/g, ''), 10)
  if (isNaN(n)) return budget
  return n.toLocaleString('ru') + ' ₽'
}

function getCompanyDisplay(size) {
  if (!size) return '—'
  const s = String(size)
  if (s.includes('200') || s === '201+') return '201+'
  return s
}

export function AdminLeadsTable({ leads, loading }) {
  const [selectedLead, setSelectedLead] = useState(null)
  const sorted = sortLeadsByTemperature(leads || [])
  const stats = (leads || []).reduce(
    (acc, l) => {
      const t = getLeadTemperature(scoreLead(l))
      acc.total++
      if (t.type === 'hot') acc.hot++
      else if (t.type === 'warm') acc.warm++
      else acc.cold++
      return acc
    },
    { total: 0, hot: 0, warm: 0, cold: 0 }
  )

  if (loading) return <p className="admin-leads-loading">Загрузка заявок...</p>
  if (!leads?.length) return <p className="admin-empty">Нет заявок</p>

  return (
    <>
      <div className="admin-leads-stats">
        <div className="admin-leads-stat">
          <span className="admin-leads-stat-icon">📋</span>
          <span className="admin-leads-stat-value">{stats.total}</span>
          <span className="admin-leads-stat-label">Всего</span>
        </div>
        <div className="admin-leads-stat admin-leads-stat-hot">
          <span className="admin-leads-stat-icon">🔥</span>
          <span className="admin-leads-stat-value">{stats.hot}</span>
          <span className="admin-leads-stat-label">Горячие</span>
        </div>
        <div className="admin-leads-stat admin-leads-stat-warm">
          <span className="admin-leads-stat-icon">🌡️</span>
          <span className="admin-leads-stat-value">{stats.warm}</span>
          <span className="admin-leads-stat-label">Тёплые</span>
        </div>
        <div className="admin-leads-stat admin-leads-stat-cold">
          <span className="admin-leads-stat-icon">❄️</span>
          <span className="admin-leads-stat-value">{stats.cold}</span>
          <span className="admin-leads-stat-label">Холодные</span>
        </div>
      </div>

      <div className="admin-leads-table-wrap">
        <table className="admin-leads-table">
          <thead>
            <tr>
              <th>Приоритет</th>
              <th>Клиент</th>
              <th>Компания</th>
              <th>Бюджет</th>
              <th>Температура</th>
              <th>Статус</th>
              <th>Отдел</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(lead => {
              const score = scoreLead(lead)
              const temp = getLeadTemperature(score)
              const dept = getLeadDepartment(lead)
              const status = getLeadStatus(lead)
              const fullName = [lead.last_name, lead.first_name].filter(Boolean).join(' ')
              return (
                <tr key={lead.id} className={`admin-leads-row admin-leads-row-${temp.type}`}>
                  <td>
                    <span className={`admin-leads-priority admin-leads-priority-${temp.type}`} title={temp.label}>
                      {temp.icon}
                    </span>
                  </td>
                  <td>
                    <div className="admin-leads-client">
                      <span>{fullName || lead.first_name + ' ' + lead.last_name}</span>
                      {lead.phone && (
                        <a href={`tel:${lead.phone}`} className="admin-leads-phone" title={lead.phone}>📞</a>
                      )}
                    </div>
                  </td>
                  <td>{getCompanyDisplay(lead.company_size)}</td>
                  <td>{formatBudget(lead.budget)}</td>
                  <td>
                    <span className={`admin-leads-temp admin-leads-temp-${temp.type}`}>
                      {temp.icon} {temp.label}
                    </span>
                  </td>
                  <td>{status}</td>
                  <td>{dept}</td>
                  <td>
                    <button
                      type="button"
                      className="admin-leads-btn-view"
                      onClick={() => setSelectedLead(lead)}
                    >
                      Просмотр
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selectedLead && (
        <AdminLeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </>
  )
}
