import { useState, useEffect, useCallback } from 'react'
import { LeadForm } from './components/LeadForm'
import { FloatingCircles } from './components/FloatingCircles'

const API_BASE = '/api'

export default function App() {
  const [adminConfig, setAdminConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [configError, setConfigError] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // GET /api/admin-config/active — загрузка услуг из БД (pgAdmin)
  useEffect(() => {
    fetch(`${API_BASE}/admin-config/active?t=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.ok ? res.json() : Promise.reject(new Error('Конфигурация не найдена')))
      .then(data => {
        setAdminConfig(data)
        setConfigError(null)
      })
      .catch(e => {
        setConfigError(e.message || 'Не удалось загрузить услуги из базы данных')
        setAdminConfig(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = useCallback(async (formData, metrics) => {
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/leads/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, ...metrics }),
      })
      const errBody = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = typeof errBody.detail === 'string'
          ? errBody.detail
          : (Array.isArray(errBody.detail) && errBody.detail[0]?.msg)
            ? errBody.detail[0].msg
            : errBody.detail || 'Ошибка отправки заявки'
        throw new Error(msg)
      }
      setSuccess(true)
    } catch (e) {
      setError(e.message || 'Ошибка сети. Проверьте подключение и попробуйте снова.')
    }
  }, [])

  if (loading) {
    return (
      <div className="app-loading">
        <FloatingCircles />
        <div className="loading-content">
          <div className="loader" />
          <p>Загрузка...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <FloatingCircles />
      <main className="main-content">
        <header className="header">
          <h1>Заявка на услугу</h1>
          <p className="subtitle">Выберите услугу и оставьте заявку — мы свяжемся с вами в ближайшее время</p>
        </header>

        {success ? (
          <div className="success-block">
            <div className="success-icon">✓</div>
            <h2>Заявка отправлена</h2>
            <p>Спасибо! Мы свяжемся с вами в указанное время.</p>
          </div>
        ) : (
          <LeadForm
            adminConfig={adminConfig}
            configError={configError}
            onSubmit={handleSubmit}
            error={error}
          />
        )}
      </main>
    </div>
  )
}
