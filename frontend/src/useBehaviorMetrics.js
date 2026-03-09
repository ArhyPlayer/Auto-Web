import { useEffect, useRef, useCallback } from 'react'

const API_BASE = '/api'

/**
 * Сбор метрик поведения для heatmap и аналитики.
 * - Время на странице (секунды)
 * - Клики по кнопкам (id, text, время)
 * - Позиция курсора — сэмпл раз в секунду
 * Отправляет POST /api/behavior-metrics/ каждую секунду.
 */
export function useBehaviorMetrics(enabled = true) {
  const startTime = useRef(Date.now())
  const lastCursor = useRef({ x: 0, y: 0, t: 0 })
  const buttonsClicked = useRef([])
  const cursorPositions = useRef([])
  const intervalRef = useRef(null)

  const handleMouseMove = useCallback((e) => {
    lastCursor.current = {
      x: e.clientX,
      y: e.clientY,
      t: Math.floor((Date.now() - startTime.current) / 1000),
    }
  }, [])

  const handleClick = useCallback((e) => {
    const target = e.target
    const isInteractive = target.closest('button, input, select, [role="button"], a')
    if (!isInteractive) return
    const btn = target.closest('button, input, select, [role="button"], a') || target
    buttonsClicked.current.push({
      id: btn.id || btn.name || 'unknown',
      text: (btn.textContent || btn.value || '').toString().slice(0, 50),
      t: Math.floor((Date.now() - startTime.current) / 1000),
    })
    // Ограничение размера
    if (buttonsClicked.current.length > 100) buttonsClicked.current.shift()
  }, [])

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('click', handleClick, true)

    const sendSnapshot = () => {
      const timeOnPage = Math.floor((Date.now() - startTime.current) / 1000)
      const cur = lastCursor.current
      if (cur.t >= 0) {
        cursorPositions.current.push({ x: cur.x, y: cur.y, t: cur.t })
        if (cursorPositions.current.length > 300) cursorPositions.current.shift()
      }

      const payload = {
        application_id: 0,
        time_on_page: timeOnPage,
        buttons_clicked: JSON.stringify(buttonsClicked.current),
        cursor_positions: JSON.stringify(cursorPositions.current),
        return_frequency: 0,
      }

      fetch(`${API_BASE}/behavior-metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {})
    }

    sendSnapshot()
    intervalRef.current = setInterval(sendSnapshot, 1000)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('click', handleClick, true)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [enabled, handleMouseMove, handleClick])
}
