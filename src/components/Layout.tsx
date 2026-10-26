import { useState, type ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logout } from '../lib/auth'
import { useProperties } from '../lib/hooks'
import { Icon } from './ui'

const MAIN = [
  ['/', 'Översikt'],
  ['/dokument', 'Dokument'],
  ['/ekonomi', 'Ekonomi och förbrukning'],
  ['/lan', 'Lån och värde'],
  ['/projekt', 'Projekt och bygglov'],
  ['/material', 'Materiallager'],
] as const

export default function Layout({ onLogout }: { onLogout: () => void }) {
  const { list: props } = useProperties()
  const [q, setQ] = useState('')
  const nav = useNavigate()
  const cls = ({ isActive }: { isActive: boolean }) => `item${isActive ? ' active' : ''}`

  return (
    <div className="shell">
      <nav className="nav" aria-label="Huvudmeny">
        <NavLink to="/" className="brand">
          <span style={{ color: '#7FD1B9' }}>
            <Icon name="home" size={26} />
          </span>
          Mina fastigheter
        </NavLink>
        <div className="nav-group">
          {MAIN.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'} className={cls}>
              {label}
            </NavLink>
          ))}
        </div>
        <div className="nav-group">
          <div className="nav-label">Fastigheter</div>
          {props.map((p) => (
            <NavLink key={p.id} to={`/fastighet/${p.id}`} className={cls}>
              <span className="dot" style={{ background: p.color }} />
              {p.name}
            </NavLink>
          ))}
        </div>
        <div className="nav-group bottom">
          <NavLink to="/installningar" className={cls}>
            Inställningar och säkerhetskopia
          </NavLink>
          <a
            href="#/"
            className="item"
            onClick={(e) => {
              e.preventDefault()
              logout()
              onLogout()
            }}
          >
            Logga ut
          </a>
        </div>
      </nav>
      <div className="main">
        <form
          className="topbar"
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            nav(`/dokument?q=${encodeURIComponent(q)}`)
          }}
        >
          <div className="search">
            <Icon name="search" />
            <input type="search" aria-label="Sök i alla dokument" placeholder="Sök i alla dokument: namn, leverantör, mapp…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className="btn primary" type="button" onClick={() => nav('/dokument?ny=1')}>
            <Icon name="upload" /> Ladda upp
          </button>
        </form>
        <Outlet />
      </div>
    </div>
  )
}

export function Page({ title, sub, actions, children }: { title: string; sub?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="content">
      <div className="row between" style={{ alignItems: 'flex-end' }}>
        <div className="stack">
          <h1>{title}</h1>
          {sub && <p className="muted">{sub}</p>}
        </div>
        {actions && <div className="row no-print">{actions}</div>}
      </div>
      {children}
    </div>
  )
}
