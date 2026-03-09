import { useState, useEffect, useCallback } from 'react'

const API_BASE = '/api'

function getAuthHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
    'Content-Type': 'application/json',
  }
}

function parseServices(services) {
  if (Array.isArray(services)) return services
  if (typeof services === 'string') {
    try {
      const p = JSON.parse(services)
      return Array.isArray(p) ? p : []
    } catch {
      return []
    }
  }
  return []
}

export function AdminServicesTable() {
  const [configs, setConfigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [formData, setFormData] = useState({
    services: [''],
    budget_min: 50000,
    budget_max: 500000,
    budget_step: 50000,
  })

  const loadConfigs = useCallback(() => {
    fetch(`${API_BASE}/admin-config`, { headers: getAuthHeaders() })
      .then(res => res.ok ? res.json() : [])
      .then(data => setConfigs(Array.isArray(data) ? data : []))
      .catch(() => setConfigs([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadConfigs()
  }, [loadConfigs])

  const handleAdd = () => {
    setAdding(true)
    setEditingId(null)
    setFormData({
      services: [''],
      budget_min: 50000,
      budget_max: 500000,
      budget_step: 50000,
    })
  }

  const handleEdit = (row) => {
    setAdding(false)
    setEditingId(row.id)
    const svc = parseServices(row.services)
    setFormData({
      services: svc.length ? svc : [''],
      budget_min: row.budget_min ?? 50000,
      budget_max: row.budget_max ?? 500000,
      budget_step: row.budget_step ?? 50000,
    })
  }

  const handleCancel = () => {
    setAdding(false)
    setEditingId(null)
  }

  const handleSaveAdd = () => {
    const services = formData.services.filter(s => String(s).trim())
    if (!services.length) {
      setError('Добавьте хотя бы одну услугу')
      return
    }
    setError('')
    fetch(`${API_BASE}/admin-config`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        services,
        budget_min: formData.budget_min,
        budget_max: formData.budget_max,
        budget_step: formData.budget_step,
      }),
    })
      .then(res => res.ok ? res.json() : Promise.reject(new Error('Ошибка создания')))
      .then(() => {
        setAdding(false)
        loadConfigs()
      })
      .catch(e => setError(e.message))
  }

  const handleSaveEdit = () => {
    const services = formData.services.filter(s => String(s).trim())
    if (!services.length) {
      setError('Добавьте хотя бы одну услугу')
      return
    }
    setError('')
    fetch(`${API_BASE}/admin-config/${editingId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        services,
        budget_min: formData.budget_min,
        budget_max: formData.budget_max,
        budget_step: formData.budget_step,
      }),
    })
      .then(res => res.ok ? res.json() : Promise.reject(new Error('Ошибка обновления')))
      .then(() => {
        setEditingId(null)
        loadConfigs()
      })
      .catch(e => setError(e.message))
  }

  const handleDelete = (id) => {
    if (!confirm('Удалить эту запись?')) return
    fetch(`${API_BASE}/admin-config/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
      .then(res => res.ok ? loadConfigs() : Promise.reject())
      .catch(() => setError('Ошибка удаления'))
  }

  const addServiceSlot = () => {
    setFormData(prev => ({ ...prev, services: [...prev.services, ''] }))
  }

  const removeServiceSlot = (idx) => {
    setFormData(prev => {
      const next = prev.services.filter((_, i) => i !== idx)
      return { ...prev, services: next.length ? next : [''] }
    })
  }

  const updateService = (idx, val) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.map((s, i) => (i === idx ? val : s)),
    }))
  }

  return (
    <section className="admin-services-block" aria-label="Управление услугами">
      <div className="admin-services-header">
        <h3>Услуги (admin_config)</h3>
      </div>
      {error && <div className="admin-table-error">{error}</div>}

      <div className="admin-services-layout">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Услуги</th>
                <th>Бюджет мин</th>
                <th>Бюджет макс</th>
                <th>Шаг</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="admin-table-loading-cell">
                    Загрузка...
                  </td>
                </tr>
              )}
              {!loading && adding && (
                <tr className="admin-table-row-edit" key="add-row">
                  <td colSpan={6}>
                    <div className="admin-edit-form">
                      <div className="admin-edit-services">
                        <label>Услуги</label>
                        {formData.services.map((s, i) => (
                          <div key={i} className="admin-edit-service-row">
                            <input
                              value={s}
                              onChange={e => updateService(i, e.target.value)}
                              placeholder="Название услуги"
                            />
                            <button type="button" className="admin-edit-remove" onClick={() => removeServiceSlot(i)}>×</button>
                          </div>
                        ))}
                        <button type="button" className="admin-edit-add-svc" onClick={addServiceSlot}>+ Услуга</button>
                      </div>
                      <div className="admin-edit-budget">
                        <label><input type="number" value={formData.budget_min} onChange={e => setFormData(p => ({ ...p, budget_min: +e.target.value }))} /> мин</label>
                        <label><input type="number" value={formData.budget_max} onChange={e => setFormData(p => ({ ...p, budget_max: +e.target.value }))} /> макс</label>
                        <label><input type="number" value={formData.budget_step} onChange={e => setFormData(p => ({ ...p, budget_step: +e.target.value }))} /> шаг</label>
                      </div>
                      <div className="admin-edit-actions">
                        <button type="button" className="admin-btn-save" onClick={handleSaveAdd}>Сохранить</button>
                        <button type="button" className="admin-btn-cancel" onClick={handleCancel}>Отмена</button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              {configs.map(row => (
                <tr key={row.id}>
                  {editingId === row.id ? (
                    <td colSpan={6}>
                      <div className="admin-edit-form">
                        <div className="admin-edit-services">
                          <label>Услуги</label>
                          {formData.services.map((s, i) => (
                            <div key={i} className="admin-edit-service-row">
                              <input
                                value={s}
                                onChange={e => updateService(i, e.target.value)}
                                placeholder="Название услуги"
                              />
                              <button type="button" className="admin-edit-remove" onClick={() => removeServiceSlot(i)}>×</button>
                            </div>
                          ))}
                          <button type="button" className="admin-edit-add-svc" onClick={addServiceSlot}>+ Услуга</button>
                        </div>
                        <div className="admin-edit-budget">
                          <label><input type="number" value={formData.budget_min} onChange={e => setFormData(p => ({ ...p, budget_min: +e.target.value }))} /> мин</label>
                          <label><input type="number" value={formData.budget_max} onChange={e => setFormData(p => ({ ...p, budget_max: +e.target.value }))} /> макс</label>
                          <label><input type="number" value={formData.budget_step} onChange={e => setFormData(p => ({ ...p, budget_step: +e.target.value }))} /> шаг</label>
                        </div>
                        <div className="admin-edit-actions">
                          <button type="button" className="admin-btn-save" onClick={handleSaveEdit}>Сохранить</button>
                          <button type="button" className="admin-btn-cancel" onClick={handleCancel}>Отмена</button>
                        </div>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td>{row.id}</td>
                      <td>
                        <div className="admin-services-cells">
                          {parseServices(row.services).map((s, i) => (
                            <span key={i} className="admin-service-tag">{s || '—'}</span>
                          ))}
                          {!parseServices(row.services).length && '—'}
                        </div>
                      </td>
                      <td>{row.budget_min?.toLocaleString('ru') ?? '—'}</td>
                      <td>{row.budget_max?.toLocaleString('ru') ?? '—'}</td>
                      <td>{row.budget_step?.toLocaleString('ru') ?? '—'}</td>
                      <td>
                        <div className="admin-row-actions">
                          <button type="button" className="admin-btn-edit" onClick={() => handleEdit(row)}>Изменить</button>
                          <button type="button" className="admin-btn-delete" onClick={() => handleDelete(row.id)}>Удалить</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!configs.length && !adding && (
            <p className="admin-table-empty">Нет записей. Нажмите «Добавить» для создания.</p>
          )}
        </div>
        <aside className="admin-toolbar-sidebar">
          <button type="button" className="admin-toolbar-btn admin-toolbar-add" onClick={handleAdd}>
            + Добавить
          </button>
        </aside>
      </div>
    </section>
  )
}
