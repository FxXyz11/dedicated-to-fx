import { useEffect, useState } from 'react'
import { Feather, Library, ListTodo, NotebookPen, Settings, WifiOff } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Today', icon: Feather, end: true },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/journal', label: 'Journal', icon: NotebookPen },
  { to: '/plans', label: 'Plans', icon: ListTodo },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AppLayout() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return (
    <div className="app-shell">
      {!online && (
        <div className="offline-note" role="status">
          <WifiOff size={15} />
          已离线 · 已下载内容和学习记录仍可使用
        </div>
      )}
      <header className="topbar">
        <NavLink className="wordmark" to="/" aria-label="Dedicated to Fx 首页">
          <span className="wordmark__seal">Fx</span>
          <span>
            <strong>Dedicated to Fx</strong>
            <small>A private reading manuscript</small>
          </span>
        </NavLink>
        <p className="topbar__note">Read slowly. Notice deeply.</p>
      </header>
      <main className="page-frame">
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="主要导航">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive ? 'bottom-nav__item is-active' : 'bottom-nav__item')}
          >
            <item.icon size={19} strokeWidth={1.7} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
