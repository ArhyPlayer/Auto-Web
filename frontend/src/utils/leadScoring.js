/**
 * Интеллектуальный анализ заявки: температура, срочность, отдел, рекомендации.
 */
const URGENT_WORDS = ['срочно', 'asap', 'срочно', '3 дней', 'недели', 'машина стоит', 'клиент ждёт', 'готовы подписать']
const WARM_DEADLINE = ['2 недель', 'месяц', 'квартал', 'до конца']
const COLD_WORDS = ['не срочно', 'когда-нибудь', 'изучаем', 'пока', 'не определились']

function parseBudget(budget) {
  if (!budget) return 0
  const s = String(budget).replace(/\s/g, '')
  const n = parseInt(s, 10)
  return isNaN(n) ? 0 : n
}

function getCompanyScore(companySize) {
  if (!companySize) return 0
  const s = String(companySize).replace(/\s/g, '')
  if (s === '200+' || s === '201+') return 25
  if (s === '51-200') return 20
  if (s === '11-50') return 15
  if (s === '1-10') return 5
  return 10
}

function getRoleScore(role) {
  if (!role) return 0
  const r = String(role).toLowerCase()
  if (r.includes('руководитель') || r.includes('владелец') || r.includes('owner')) return 20
  if (r.includes('сотрудник')) return 5
  return 10
}

function getDeadlineScore(deadline) {
  if (!deadline) return 0
  const d = String(deadline).toLowerCase()
  if (URGENT_WORDS.some(w => d.includes(w))) return 30
  if (WARM_DEADLINE.some(w => d.includes(w))) return 15
  if (COLD_WORDS.some(w => d.includes(w))) return 0
  return 10
}

function getBudgetScore(budget) {
  const b = parseBudget(budget)
  if (b >= 1000000) return 25
  if (b >= 500000) return 20
  if (b >= 200000) return 15
  if (b >= 50000) return 10
  if (b > 0) return 5
  return 0
}

function getContactScore(method) {
  if (!method) return 0
  const m = String(method).toLowerCase()
  if (m.includes('телефон') || m.includes('whatsapp') || m.includes('telegram')) return 10
  if (m.includes('email')) return 5
  return 2
}

function getConcretenessScore(lead) {
  let s = 0
  if (lead.business_info && lead.business_info.length > 20) s += 5
  if (lead.business_niche) s += 5
  if (lead.task_volume && lead.task_volume.length > 5) s += 5
  if (lead.need_volume && lead.need_volume.length > 5) s += 5
  if (lead.product_of_interest) s += 5
  if (lead.comments && lead.comments.length > 10) s += 5
  return Math.min(s, 20)
}

export function scoreLead(lead) {
  const score =
    getCompanyScore(lead.company_size) +
    getRoleScore(lead.role) +
    getDeadlineScore(lead.deadline) +
    getBudgetScore(lead.budget) +
    getContactScore(lead.preferred_contact_method) +
    getConcretenessScore(lead)
  return Math.min(100, Math.max(0, score))
}

export function getLeadTemperature(score) {
  if (score >= 70) return { type: 'hot', label: 'Горячий', icon: '🔥' }
  if (score >= 40) return { type: 'warm', label: 'Тёплый', icon: '🌡️' }
  return { type: 'cold', label: 'Холодный', icon: '❄️' }
}

export function getLeadUrgency(score) {
  if (score >= 70) return 'Высокий'
  if (score >= 40) return 'Средний'
  return 'Низкий'
}

export function getLeadDepartment(lead) {
  const score = scoreLead(lead)
  const budget = parseBudget(lead.budget)
  const companyScore = getCompanyScore(lead.company_size)
  if (score >= 75 || budget >= 1000000 || companyScore >= 20) return 'VIP'
  return 'Общий'
}

export function needsPersonalManager(lead) {
  const score = scoreLead(lead)
  const dept = getLeadDepartment(lead)
  return score >= 70 || dept === 'VIP'
}

export function worthSpendingTime(lead) {
  const score = scoreLead(lead)
  return score >= 40
}

export function getLeadStatus(lead) {
  const score = scoreLead(lead)
  if (score >= 70) return 'Стоит внимания'
  if (score >= 40) return 'Стоит внимания'
  return 'Можно отложить'
}

export function sortLeadsByTemperature(leads) {
  return [...leads].sort((a, b) => scoreLead(b) - scoreLead(a))
}
