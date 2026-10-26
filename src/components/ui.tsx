import { useEffect, type ReactNode } from 'react'
import type { Property } from '../types'

const paths: Record<string, ReactNode> = {
  home: (
    <>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  print: (
    <>
      <path d="M7 9V3h10v6" />
      <rect x="3" y="9" width="18" height="8" rx="2" />
      <path d="M7 14h10v7H7z" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 20h14" />
    </>
  ),
  open: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4l-9 9" />
      <path d="M18 14v6H4V6h6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M9 7V4h6v3" />
    </>
  ),
  edit: <path d="M4 20h4L19 9l-4-4L4 16v4z" />,
  upload: (
    <>
      <path d="M12 20V9" />
      <path d="M7 13l5-5 5 5" />
      <path d="M5 4h14" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
}

export function Icon({ name, size = 18 }: { name: keyof typeof paths | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="row between">
          <h2>{title}</h2>
          <button className="btn ghost icon-btn" aria-label="Stäng" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function PropAvatar({ p, size = 40 }: { p: Property; size?: number }) {
  return (
    <span className="avatar" style={{ background: p.tint, color: p.color, width: size, height: size, fontSize: size < 40 ? 12 : 14 }}>
      {p.short}
    </span>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      {children}
    </label>
  )
}

export interface Series {
  key: string
  color: string
}

/** Staplat stapeldiagram. values[i][key] = belopp. */
export function StackedBars({ labels, values, series, height = 180, unit = 'kr' }: { labels: string[]; values: Record<string, number>[]; series: Series[]; height?: number; unit?: string }) {
  const totals = values.map((v) => series.reduce((s, x) => s + (v[x.key] ?? 0), 0))
  const max = Math.max(1, ...totals)
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="bars" style={{ height }} role="img" aria-label={`Diagram, högsta värde ${Math.round(max)} ${unit}`}>
        {values.map((v, i) => (
          <div key={i} className="bar-col" title={`${labels[i]}: ${Math.round(totals[i]).toLocaleString('sv-SE')} ${unit}`} style={{ height: `${(totals[i] / max) * 100}%` }}>
            {series.map((s) =>
              v[s.key] ? <div key={s.key} style={{ height: `${(v[s.key] / totals[i]) * 100}%`, background: s.color }} /> : null,
            )}
          </div>
        ))}
      </div>
      <div className="bar-labels">
        {labels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    </div>
  )
}

export const CAT_COLORS: Record<string, string> = {
  El: '#1F6F5C',
  'Vatten och avlopp': '#3B82C4',
  Värme: '#E08A3C',
  'Internet och tv': '#8C99A4',
  Försäkring: '#5B6670',
  Renhållning: '#B7C1C9',
  Fastighetsavgift: '#7C3AED',
  Ränta: '#17212B',
  Samfällighet: '#C2A35A',
  Övrigt: '#D7DDE2',
}
