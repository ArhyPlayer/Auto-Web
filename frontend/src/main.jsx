import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import AdminApp from './AdminApp'
import { useBehaviorMetrics } from './useBehaviorMetrics'
import './index.css'

const pathname = window.location.pathname
const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/')

function Root() {
  useBehaviorMetrics(!isAdmin)
  return isAdmin ? <AdminApp /> : <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
