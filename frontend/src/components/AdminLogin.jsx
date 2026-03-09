import { useState, useEffect } from 'react'

const API_BASE = '/api'

export function AdminLogin({ onSuccess }) {
  const [canRegister, setCanRegister] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API_BASE}/auth/can-register`)
      .then(res => res.json())
      .then(data => setCanRegister(data.can_register === true))
      .catch(() => setCanRegister(false))
      .finally(() => setLoading(false))
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password) {
      setError('Заполните логин и пароль')
      return
    }
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Ошибка входа')
      localStorage.setItem('admin_token', data.access_token)
      onSuccess(data.admin)
    } catch (err) {
      setError(err.message || 'Ошибка входа')
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password || !passwordConfirm) {
      setError('Заполните все поля')
      return
    }
    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов')
      return
    }
    if (password !== passwordConfirm) {
      setError('Пароли не совпадают')
      return
    }
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Ошибка регистрации')
      localStorage.setItem('admin_token', data.access_token)
      onSuccess(data.admin)
    } catch (err) {
      setError(err.message || 'Ошибка регистрации')
    }
  }

  const handleSubmit = mode === 'login' ? handleLogin : handleRegister

  if (loading) {
    return (
      <div className="admin-login-loading">
        <div className="loader" />
        <p>Загрузка...</p>
      </div>
    )
  }

  return (
    <div className="admin-login">
      <h1>Вход в админ-панель</h1>
      <form onSubmit={handleSubmit} className="admin-login-form">
        {error && <div className="admin-error">{error}</div>}
        <div className="admin-field">
          <label>Логин</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Логин"
            autoComplete="username"
          />
        </div>
        <div className="admin-field">
          <label>Пароль</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Пароль"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </div>
        {mode === 'register' && (
          <div className="admin-field">
            <label>Повторите пароль</label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={e => setPasswordConfirm(e.target.value)}
              placeholder="Повторите пароль"
              autoComplete="new-password"
            />
          </div>
        )}
        <button type="submit" className="admin-btn-submit">
          {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
        </button>
        {canRegister && mode === 'login' && (
          <button
            type="button"
            className="admin-btn-link"
            onClick={() => { setMode('register'); setError(''); }}
          >
            Зарегистрироваться
          </button>
        )}
        {mode === 'register' && (
          <button
            type="button"
            className="admin-btn-link"
            onClick={() => { setMode('login'); setError(''); }}
          >
            Назад к входу
          </button>
        )}
      </form>
    </div>
  )
}
