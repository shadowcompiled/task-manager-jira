import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './components/App'
import './index.css'

// Apply saved theme before first paint; default to light when missing or invalid
const savedTheme = localStorage.getItem('mission-tracker-theme')
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark')
  document.documentElement.classList.remove('light-mode')
} else {
  document.documentElement.classList.remove('dark')
  document.documentElement.classList.add('light-mode')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
