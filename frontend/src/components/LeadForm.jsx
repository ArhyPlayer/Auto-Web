import { useState, useEffect, useRef, useCallback } from 'react'

export function LeadForm({ adminConfig, onSubmit, error }) {
  const startTime = useRef(Date.now())
  const cursorPositions = useRef([])
  const buttonsClicked = useRef([])
  const returnCount = useRef(0)

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    patronymic: '',
    phone: '',
    email: '',
    business_niche: '',
    company_size: '',
    task_volume: '',
    role: '',
    business_size: '',
    need_volume: '',
    deadline: '',
    task_type: '',
    product_of_interest: '',
    budget: '',
    preferred_contact_method: '',
    convenient_time: '',
    business_info: '',
    comments: '',
  })

  // Услуги из GET /api/admin-config/active (могут прийти как массив или JSON-строка)
  const servicesRaw = adminConfig?.services
  let services = []
  if (Array.isArray(servicesRaw)) {
    services = servicesRaw
  } else if (typeof servicesRaw === 'string') {
    try {
      const parsed = JSON.parse(servicesRaw)
      services = Array.isArray(parsed) ? parsed : []
    } catch {
      services = []
    }
  }
  const serviceLabels = services.map(s =>
    typeof s === 'string' ? s : (s?.name ?? s?.label ?? String(s))
  )
  const budgetMin = adminConfig?.budget_min ?? 50000
  const budgetMax = adminConfig?.budget_max ?? 5000000
  const budgetStep = adminConfig?.budget_step ?? 50000

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }, [])

  const handleClick = useCallback((e) => {
    const target = e.target
    if (target.tagName === 'BUTTON' || target.closest('button') || target.tagName === 'INPUT' || target.tagName === 'SELECT') {
      buttonsClicked.current.push({
        id: target.id || target.name || 'unknown',
        text: target.textContent?.slice(0, 50) || target.value?.slice(0, 50),
        time: Date.now() - startTime.current,
      })
    }
  }, [])

  const handleMouseMove = useCallback((e) => {
    cursorPositions.current.push({
      x: e.clientX,
      y: e.clientY,
      t: Date.now() - startTime.current,
    })
    if (cursorPositions.current.length > 200) cursorPositions.current.shift()
  }, [])

  useEffect(() => {
    returnCount.current = (sessionStorage.getItem('lead_form_returns') || 0) * 1 + 1
    sessionStorage.setItem('lead_form_returns', returnCount.current)
  }, [])

  useEffect(() => {
    document.addEventListener('click', handleClick)
    document.addEventListener('mousemove', handleMouseMove)
    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [handleClick, handleMouseMove])

  const handleSubmit = (e) => {
    e.preventDefault()
    const timeOnPage = Math.floor((Date.now() - startTime.current) / 1000)
    // Ограничиваем размер метрик — большие payload могут вызывать ERR_CONNECTION_RESET
    const metrics = {
      time_on_page_seconds: timeOnPage,
      buttons_clicked: buttonsClicked.current.slice(-15).map(b => ({
        id: b.id,
        text: (b.text || '').slice(0, 30),
        time: b.time,
      })),
      cursor_positions: cursorPositions.current.slice(-10).map(c => ({ x: c.x, y: c.y, t: c.t })),
      return_count: returnCount.current,
      raw_data: {},
    }
    const payload = { ...form }
    if (form.budget) payload.budget = String(form.budget)
    onSubmit(payload, metrics)
  }

  const formatBudget = (v) => {
    if (!v) return ''
    const n = Number(v)
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)} млн ₽`
    if (n >= 1000) return `${(n / 1000).toFixed(0)} тыс ₽`
    return `${n} ₽`
  }

  return (
    <form className="lead-form" onSubmit={handleSubmit} onClick={handleClick}>
      {error && <div className="form-error">{error}</div>}

      {/* Главный блок: выбор услуги (GET /api/admin-config/active → services из БД) */}
      <section className="form-section form-section-hero">
        <h3>Выберите услугу</h3>
        <p className="section-hint">Наши основные направления — выберите интересующий продукт</p>
        <div className="field full">
          <label htmlFor="product_of_interest">Интересующий продукт / услуга *</label>
          <select
            id="product_of_interest"
            name="product_of_interest"
            value={form.product_of_interest}
            onChange={handleChange}
            required
            className="select-hero"
          >
            <option value="">— Выберите услугу —</option>
            {serviceLabels.map((label, i) => (
              <option key={i} value={label}>{label}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="form-section">
        <h3>Контактные данные</h3>
        <div className="form-row">
          <div className="field">
            <label htmlFor="first_name">Имя *</label>
            <input
              id="first_name"
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              required
              placeholder="Иван"
            />
          </div>
          <div className="field">
            <label htmlFor="last_name">Фамилия *</label>
            <input
              id="last_name"
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              required
              placeholder="Иванов"
            />
          </div>
          <div className="field">
            <label htmlFor="patronymic">Отчество</label>
            <input
              id="patronymic"
              name="patronymic"
              value={form.patronymic}
              onChange={handleChange}
              placeholder="Иванович"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="phone">Телефон</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="+7 (999) 123-45-67"
            />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="email@example.com"
            />
          </div>
        </div>
      </section>

      <section className="form-section">
        <h3>О бизнесе</h3>
        <div className="form-row">
          <div className="field">
            <label htmlFor="business_niche">Ниша бизнеса</label>
            <input
              id="business_niche"
              name="business_niche"
              value={form.business_niche}
              onChange={handleChange}
              placeholder="Например: автосервис"
            />
          </div>
          <div className="field">
            <label htmlFor="company_size">Размер компании</label>
            <select
              id="company_size"
              name="company_size"
              value={form.company_size}
              onChange={handleChange}
            >
              <option value="">Выберите</option>
              <option value="1-10">1–10 человек</option>
              <option value="11-50">11–50 человек</option>
              <option value="51-200">51–200 человек</option>
              <option value="200+">200+ человек</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="role">Ваша роль</label>
            <select
              id="role"
              name="role"
              value={form.role}
              onChange={handleChange}
            >
              <option value="">Выберите</option>
              <option value="Руководитель">Руководитель</option>
              <option value="Сотрудник">Сотрудник</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="business_size">Размер бизнеса</label>
            <input
              id="business_size"
              name="business_size"
              value={form.business_size}
              onChange={handleChange}
              placeholder="Оборот, количество клиентов"
            />
          </div>
        </div>
        <div className="field full">
          <label htmlFor="business_info">Информация о бизнесе</label>
          <textarea
            id="business_info"
            name="business_info"
            value={form.business_info}
            onChange={handleChange}
            rows={3}
            placeholder="Кратко опишите ваш бизнес и текущую ситуацию"
          />
        </div>
      </section>

      <section className="form-section">
        <h3>Задача</h3>
        <div className="form-row">
          <div className="field">
            <label htmlFor="task_volume">Объём задачи</label>
            <input
              id="task_volume"
              name="task_volume"
              value={form.task_volume}
              onChange={handleChange}
              placeholder="Масштаб проекта"
            />
          </div>
          <div className="field">
            <label htmlFor="need_volume">Объём потребности</label>
            <input
              id="need_volume"
              name="need_volume"
              value={form.need_volume}
              onChange={handleChange}
              placeholder="Что требуется"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="field full">
            <label htmlFor="task_type">Тип задачи</label>
            <input
              id="task_type"
              name="task_type"
              value={form.task_type}
              onChange={handleChange}
              placeholder="Разработка, консультация..."
            />
          </div>
        </div>
        <div className="field full">
          <label htmlFor="deadline">Срок, когда нужен результат</label>
          <input
            id="deadline"
            name="deadline"
            value={form.deadline}
            onChange={handleChange}
            placeholder="Например: до конца квартала"
          />
        </div>
      </section>

      <section className="form-section">
        <h3>Бюджет и связь</h3>
        <div className="field full">
          <label>
            Бюджет: {formatBudget(form.budget) || '—'}
          </label>
          <input
            type="range"
            name="budget"
            min={budgetMin}
            max={budgetMax}
            step={budgetStep}
            value={form.budget ? Number(form.budget) : budgetMin}
            onChange={handleChange}
            className="budget-slider"
          />
          <div className="slider-labels">
            <span>{formatBudget(budgetMin)}</span>
            <span>{formatBudget(budgetMax)}</span>
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="preferred_contact_method">Предпочтительный способ связи</label>
            <select
              id="preferred_contact_method"
              name="preferred_contact_method"
              value={form.preferred_contact_method}
              onChange={handleChange}
            >
              <option value="">Выберите</option>
              <option value="Телефон">Телефон</option>
              <option value="Email">Email</option>
              <option value="Telegram">Telegram</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Звонок в удобное время">Звонок в удобное время</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="convenient_time">Удобное время</label>
            <input
              id="convenient_time"
              name="convenient_time"
              value={form.convenient_time}
              onChange={handleChange}
              placeholder="Например: 10:00–18:00"
            />
          </div>
        </div>
        <div className="field full">
          <label htmlFor="comments">Комментарии</label>
          <textarea
            id="comments"
            name="comments"
            value={form.comments}
            onChange={handleChange}
            rows={4}
            placeholder="Дополнительная информация"
          />
        </div>
      </section>

      <div className="form-actions">
        <button type="submit" className="btn-submit">
          Отправить заявку
        </button>
      </div>
    </form>
  )
}
