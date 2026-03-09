import { useState, useEffect, useMemo } from 'react'

const API_BASE = '/api'

function parseJsonField(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try {
      const p = JSON.parse(val)
      return Array.isArray(p) ? p : []
    } catch {
      return []
    }
  }
  return []
}

function formatSeconds(s) {
  if (s < 60) return `${s} сек`
  const m = Math.floor(s / 60)
  const sec = s % 60
  return sec ? `${m} мин ${sec} сек` : `${m} мин`
}

function getAuthHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
}

export function AdminStatsModal({ onClose }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchAll = async () => {
      const all = []
      for (let skip = 0; skip < 2000; skip += 500) {
        const res = await fetch(`${API_BASE}/behavior-metrics?skip=${skip}&limit=500`, {
          headers: getAuthHeaders(),
        })
        if (!res.ok) throw new Error('Ошибка загрузки')
        const chunk = await res.json()
        if (!chunk?.length) break
        all.push(...chunk)
      }
      setData(all)
    }
    fetchAll()
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    const now = Date.now()
    const dayAgo = now - 24 * 60 * 60 * 1000
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000

    const inPeriod = (createdAt) => {
      const t = new Date(createdAt).getTime()
      return { day: t >= dayAgo, week: t >= weekAgo, month: t >= monthAgo }
    }

    let daySum = 0, dayCount = 0, dayMax = 0
    let weekSum = 0, weekCount = 0, weekMax = 0
    let monthSum = 0, monthCount = 0, monthMax = 0

    for (const row of data) {
      const p = inPeriod(row.created_at)
      const t = row.time_on_page ?? 0
      if (p.day) {
        daySum += t
        dayCount++
        if (t > dayMax) dayMax = t
      }
      if (p.week) {
        weekSum += t
        weekCount++
        if (t > weekMax) weekMax = t
      }
      if (p.month) {
        monthSum += t
        monthCount++
        if (t > monthMax) monthMax = t
      }
    }

    return {
      day: { avg: dayCount ? Math.round(daySum / dayCount) : 0, max: dayMax, count: dayCount },
      week: { avg: weekCount ? Math.round(weekSum / weekCount) : 0, max: weekMax, count: weekCount },
      month: { avg: monthCount ? Math.round(monthSum / monthCount) : 0, max: monthMax, count: monthCount },
    }
  }, [data])

  const heatmapData = useMemo(() => {
    const grid = new Map()
    const cellSize = 20
    for (const row of data) {
      const positions = parseJsonField(row.cursor_positions)
      for (const p of positions) {
        const x = Number(p.x)
        const y = Number(p.y)
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue
        const key = `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)}`
        grid.set(key, (grid.get(key) || 0) + 1)
      }
    }
    const maxCount = Math.max(1, ...grid.values())
    return Array.from(grid.entries()).map(([k, count]) => {
      const [gx, gy] = k.split(',').map(Number)
      return { x: gx * cellSize, y: gy * cellSize, count, intensity: count / maxCount }
    })
  }, [data])

  const bounds = useMemo(() => {
    if (!heatmapData.length) return { w: 1200, h: 800 }
    let maxX = 0, maxY = 0
    for (const p of heatmapData) {
      if (p.x > maxX) maxX = p.x
      if (p.y > maxY) maxY = p.y
    }
    return { w: Math.min(1920, maxX + 100), h: Math.min(1080, maxY + 100) }
  }, [heatmapData])

  if (loading) {
    return (
      <div className="admin-stats-modal" onClick={onClose}>
        <div className="admin-stats-content" onClick={e => e.stopPropagation()}>
          <div className="admin-stats-loading">Загрузка статистики...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-stats-modal" onClick={onClose}>
      <div className="admin-stats-content" onClick={e => e.stopPropagation()}>
        <div className="admin-stats-header">
          <h2>Статистика пользователей на странице заказа</h2>
          <button type="button" className="admin-stats-close" onClick={onClose}>×</button>
        </div>
        {error && <div className="admin-stats-error">{error}</div>}
        <section className="admin-stats-time">
          <h3>Время на странице</h3>
          <div className="admin-stats-cards">
            <div className="admin-stats-card">
              <span className="admin-stats-period">За день (24 ч)</span>
              <span className="admin-stats-avg">Среднее: {formatSeconds(stats.day.avg)}</span>
              <span className="admin-stats-max">Макс: {formatSeconds(stats.day.max)}</span>
              <span className="admin-stats-count">{stats.day.count} записей</span>
            </div>
            <div className="admin-stats-card">
              <span className="admin-stats-period">За неделю</span>
              <span className="admin-stats-avg">Среднее: {formatSeconds(stats.week.avg)}</span>
              <span className="admin-stats-max">Макс: {formatSeconds(stats.week.max)}</span>
              <span className="admin-stats-count">{stats.week.count} записей</span>
            </div>
            <div className="admin-stats-card">
              <span className="admin-stats-period">За месяц</span>
              <span className="admin-stats-avg">Среднее: {formatSeconds(stats.month.avg)}</span>
              <span className="admin-stats-max">Макс: {formatSeconds(stats.month.max)}</span>
              <span className="admin-stats-count">{stats.month.count} записей</span>
            </div>
          </div>
        </section>
        <section className="admin-stats-heatmap">
          <h3>Хитмап позиций курсора</h3>
          <p className="admin-stats-hint">Яркость кружков показывает, где пользователи чаще держали курсор</p>
          <div className="admin-stats-heatmap-wrap">
            <svg viewBox={`0 0 ${bounds.w} ${bounds.h}`} className="admin-stats-heatmap-svg">
              {heatmapData.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={12 + p.intensity * 20}
                  fill={`rgba(212, 175, 55, ${0.2 + p.intensity * 0.7})`}
                  stroke="rgba(212, 175, 55, 0.5)"
                  strokeWidth={1}
                />
              ))}
            </svg>
          </div>
        </section>
      </div>
    </div>
  )
}
