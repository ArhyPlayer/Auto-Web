import {
  scoreLead,
  getLeadTemperature,
  getLeadUrgency,
  getLeadDepartment,
  needsPersonalManager,
  worthSpendingTime,
} from '../utils/leadScoring'

function formatBudget(budget) {
  if (!budget) return '—'
  const n = parseInt(String(budget).replace(/\s/g, ''), 10)
  if (isNaN(n)) return budget
  return n.toLocaleString('ru') + ' ₽'
}

export function AdminLeadDetailModal({ lead, onClose }) {
  if (!lead) return null
  const score = scoreLead(lead)
  const temp = getLeadTemperature(score)
  const urgency = getLeadUrgency(score)
  const department = getLeadDepartment(lead)
  const needManager = needsPersonalManager(lead)
  const worthTime = worthSpendingTime(lead)
  const fullName = [lead.last_name, lead.first_name, lead.patronymic].filter(Boolean).join(' ')

  return (
    <div className="admin-lead-modal-overlay" onClick={onClose}>
      <div className="admin-lead-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-lead-modal-header">
          <h2>Заявка #{lead.id}</h2>
          <button type="button" className="admin-lead-modal-close" onClick={onClose}>×</button>
        </div>

        <section className="admin-lead-analysis">
          <h3>Анализ заявки</h3>
          <div className="admin-lead-analysis-grid">
            <div className={`admin-lead-temp-badge admin-lead-temp-${temp.type}`}>
              {temp.icon} {temp.label} ({score} баллов)
            </div>
            <div className="admin-lead-analysis-item">
              <span className="admin-lead-analysis-label">Срочность</span>
              <span>{urgency}</span>
            </div>
            <div className="admin-lead-analysis-item">
              <span className="admin-lead-analysis-label">Отдел</span>
              <span>{department}</span>
            </div>
            {needManager && (
              <div className="admin-lead-recommend">👤 Требуется персональный менеджер</div>
            )}
            {worthTime && (
              <div className="admin-lead-recommend">⚠️ Стоит потратить время</div>
            )}
          </div>
        </section>

        <section className="admin-lead-contact">
          <h3>Контактная информация</h3>
          <div className="admin-lead-contact-grid">
            <div><span className="admin-lead-field-label">ФИО</span> {fullName}</div>
            {lead.phone && (
              <div>
                <span className="admin-lead-field-label">Телефон</span>{' '}
                <a href={`tel:${lead.phone}`}>{lead.phone}</a>
              </div>
            )}
            {lead.email && (
              <div>
                <span className="admin-lead-field-label">Email</span>{' '}
                <a href={`mailto:${lead.email}`}>{lead.email}</a>
              </div>
            )}
            {lead.convenient_time && (
              <div><span className="admin-lead-field-label">Удобное время</span> {lead.convenient_time}</div>
            )}
            {lead.preferred_contact_method && (
              <div><span className="admin-lead-field-label">Способ связи</span> {lead.preferred_contact_method}</div>
            )}
          </div>
        </section>

        <section className="admin-lead-company">
          <h3>Информация о компании</h3>
          <div className="admin-lead-contact-grid">
            {lead.company_size && (
              <div><span className="admin-lead-field-label">Размер компании</span> {lead.company_size}</div>
            )}
            {lead.role && (
              <div><span className="admin-lead-field-label">Роль</span> {lead.role}</div>
            )}
            {lead.business_niche && (
              <div><span className="admin-lead-field-label">Ниша</span> {lead.business_niche}</div>
            )}
            {lead.business_info && (
              <div className="admin-lead-full"><span className="admin-lead-field-label">О бизнесе</span> {lead.business_info}</div>
            )}
            {lead.business_size && (
              <div><span className="admin-lead-field-label">Масштаб</span> {lead.business_size}</div>
            )}
          </div>
        </section>

        <section className="admin-lead-order">
          <h3>Детали заказа</h3>
          <div className="admin-lead-contact-grid">
            {lead.product_of_interest && (
              <div><span className="admin-lead-field-label">Продукт / услуга</span> {lead.product_of_interest}</div>
            )}
            {lead.task_volume && (
              <div><span className="admin-lead-field-label">Объём задачи</span> {lead.task_volume}</div>
            )}
            {lead.need_volume && (
              <div><span className="admin-lead-field-label">Потребность</span> {lead.need_volume}</div>
            )}
            {lead.deadline && (
              <div><span className="admin-lead-field-label">Срок</span> {lead.deadline}</div>
            )}
            {lead.task_type && (
              <div><span className="admin-lead-field-label">Тип задачи</span> {lead.task_type}</div>
            )}
            {(lead.budget || lead.budget === '0') && (
              <div><span className="admin-lead-field-label">Бюджет</span> {formatBudget(lead.budget)}</div>
            )}
            {lead.comments && (
              <div className="admin-lead-full"><span className="admin-lead-field-label">Комментарии</span> {lead.comments}</div>
            )}
          </div>
        </section>

        <div className="admin-lead-modal-footer">
          <button type="button" className="admin-lead-btn-close" onClick={onClose}>Закрыть</button>
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="admin-lead-btn-call">Позвонить</a>
          )}
        </div>
      </div>
    </div>
  )
}
