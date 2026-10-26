import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Page } from '../components/Layout'
import { CAT_COLORS, Field, Icon, Modal, StackedBars } from '../components/ui'
import { db, uid } from '../db'
import { saveBlob } from '../lib/files'
import { fmtKr, MONTHS, parseAmount, today } from '../lib/format'
import { matchOwner, OWNER_FILTERS, useProperties, type OwnerFilter } from '../lib/hooks'
import { COST_CATEGORIES, type Cost, type CostCategory } from '../types'

export default function Economy() {
  const { list: props, byId } = useProperties()
  const costs = useLiveQuery(() => db.costs.toArray(), []) ?? []
  const years = useMemo(() => [...new Set(costs.map((c) => c.date.slice(0, 4)))].sort().reverse(), [costs])
  const [year, setYear] = useState<string>('')
  const [prop, setProp] = useState('alla')
  const [owner, setOwner] = useState<OwnerFilter>('alla')
  const [editing, setEditing] = useState<Cost | null>(null)
  const y = year || years[0] || String(new Date().getFullYear())

  const rows = costs.filter((c) => c.date.startsWith(y) && (prop === 'alla' || c.propertyId === prop) && matchOwner(byId[c.propertyId], owner))
  const monthVals = MONTHS.map((_, i) => {
    const m = `${y}-${String(i + 1).padStart(2, '0')}`
    const v: Record<string, number> = {}
    for (const c of rows.filter((r) => r.date.startsWith(m))) v[c.category] = (v[c.category] ?? 0) + c.amount
    return v
  })
  const usedCats = COST_CATEGORIES.filter((c) => rows.some((r) => r.category === c))
  const total = rows.reduce((s, r) => s + r.amount, 0)
  const ownerNames = (o: 'privat' | 'foretag') =>
    props
      .filter((p) => matchOwner(p, o))
      .map((p) => p.name)
      .join(', ') || 'Inga fastigheter'
  const sumOwner = (o: 'privat' | 'foretag') => rows.filter((r) => matchOwner(byId[r.propertyId], o)).reduce((s, r) => s + r.amount, 0)
  const prevSameSpan = (() => {
    const lastMonth = rows.reduce((m, r) => (r.date.slice(5, 7) > m ? r.date.slice(5, 7) : m), '00')
    const py = String(+y - 1)
    return costs.filter((c) => c.date.startsWith(py) && c.date.slice(5, 7) <= lastMonth && (prop === 'alla' || c.propertyId === prop) && matchOwner(byId[c.propertyId], owner)).reduce((s, c) => s + c.amount, 0)
  })()

  function exportCsv() {
    const head = ['Datum', 'Fastighet', 'Kategori', 'Leverantör', 'Belopp', 'kWh', 'Kommentar']
    const lines = [...rows]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((r) => [r.date, byId[r.propertyId]?.name, r.category, r.supplier ?? '', String(r.amount).replace('.', ','), r.kwh ?? '', r.note ?? ''].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';'))
    saveBlob(new Blob(['﻿' + [head.join(';'), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' }), `kostnader-${y}.csv`)
  }

  return (
    <Page
      title="Ekonomi och förbrukning"
      sub="Löpande kostnader per månad och fastighet. Exporten öppnas direkt i Excel."
      actions={
        <>
          <button className="btn" onClick={exportCsv} disabled={!rows.length}>
            <Icon name="download" /> Exportera till Excel
          </button>
          <button className="btn primary" onClick={() => setEditing({ id: '', propertyId: props[0]?.id ?? '', date: today(), category: 'El', amount: 0 })}>
            <Icon name="plus" /> Ny kostnad
          </button>
        </>
      }
    >
      <div className="row no-print">
        <select className="input" style={{ width: 'auto' }} aria-label="År" value={y} onChange={(e) => setYear(e.target.value)}>
          {(years.length ? years : [y]).map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select className="input" style={{ width: 'auto' }} aria-label="Fastighet" value={prop} onChange={(e) => setProp(e.target.value)}>
          <option value="alla">Alla fastigheter</option>
          {props.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <div className="seg">
          {OWNER_FILTERS.map(([k, l]) => (
            <button key={k} className={owner === k ? 'on' : ''} onClick={() => setOwner(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid" style={{ ['--min' as string]: '200px' }}>
        {[
          ['Totalt ' + y, total, `${rows.length} poster`],
          ['Privat', sumOwner('privat'), ownerNames('privat')],
          ['Företag', sumOwner('foretag'), ownerNames('foretag')],
          ['Samma period året före', prevSameSpan, prevSameSpan ? `Skillnad ${fmtKr(total - prevSameSpan)}` : 'Inga poster'],
        ].map(([l, v, s]) => (
          <div key={l as string} className="card" style={{ gap: 4 }}>
            <span className="kpi-label">{l}</span>
            <span className="kpi-value">{fmtKr(v as number)}</span>
            <span className="muted small">{s}</span>
          </div>
        ))}
      </div>

      <section className="card">
        <div className="row between">
          <h2>Kostnader per månad {y}</h2>
          <div className="legend">
            {usedCats.map((c) => (
              <span key={c}>
                <i style={{ background: CAT_COLORS[c] }} />
                {c}
              </span>
            ))}
          </div>
        </div>
        <StackedBars labels={MONTHS} values={monthVals} series={usedCats.map((c) => ({ key: c, color: CAT_COLORS[c] }))} height={220} />
      </section>

      <section className="card">
        <h2>Per fastighet och kategori {y}</h2>
        <div className="table-wrap">
          <table className="t" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th>Fastighet</th>
                {usedCats.map((c) => (
                  <th key={c} className="num">
                    {c}
                  </th>
                ))}
                <th className="num">Summa</th>
              </tr>
            </thead>
            <tbody>
              {props
                .filter((p) => matchOwner(p, owner) && (prop === 'alla' || p.id === prop))
                .map((p) => {
                  const pr = rows.filter((r) => r.propertyId === p.id)
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                        <span className="dot" style={{ background: p.color, marginRight: 8 }} />
                        {p.name}
                      </td>
                      {usedCats.map((c) => (
                        <td key={c} className="num">
                          {fmtKr(pr.filter((r) => r.category === c).reduce((s, r) => s + r.amount, 0) || undefined)}
                        </td>
                      ))}
                      <td className="num" style={{ fontWeight: 700 }}>
                        {fmtKr(pr.reduce((s, r) => s + r.amount, 0) || undefined)}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Alla poster {y}</h2>
        <div className="table-wrap">
          <table className="t" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th>Datum</th>
                <th>Fastighet</th>
                <th>Kategori</th>
                <th>Leverantör</th>
                <th>Kommentar</th>
                <th className="num">kWh</th>
                <th className="num">Belopp</th>
              </tr>
            </thead>
            <tbody>
              {[...rows]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((r) => (
                  <tr key={r.id} className="click" onClick={() => setEditing(r)}>
                    <td>{r.date}</td>
                    <td>{byId[r.propertyId]?.name}</td>
                    <td>{r.category}</td>
                    <td>{r.supplier ?? '–'}</td>
                    <td className="muted small">{r.note}</td>
                    <td className="num">{r.kwh ?? ''}</td>
                    <td className="num">{fmtKr(r.amount)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <div className="empty">Inga kostnader {y}.</div>}
      </section>

      {editing && <CostModal c={editing} onClose={() => setEditing(null)} />}
    </Page>
  )
}

function CostModal({ c, onClose }: { c: Cost; onClose: () => void }) {
  const { list: props } = useProperties()
  const [d, setD] = useState({ ...c, amountText: c.amount ? String(c.amount) : '', kwhText: c.kwh != null ? String(c.kwh) : '' })
  return (
    <Modal title={c.id ? 'Ändra kostnad' : 'Ny kostnad'} onClose={onClose}>
      <div className="grid" style={{ ['--min' as string]: '200px', gap: 12 }}>
        <Field label="Fastighet">
          <select className="input" value={d.propertyId} onChange={(e) => setD({ ...d, propertyId: e.target.value })}>
            {props.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Kategori">
          <select className="input" value={d.category} onChange={(e) => setD({ ...d, category: e.target.value as CostCategory })}>
            {COST_CATEGORIES.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="Datum (eller månadens första dag)">
          <input className="input" type="date" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} />
        </Field>
        <Field label="Belopp inkl. moms (kr)">
          <input className="input" inputMode="decimal" value={d.amountText} onChange={(e) => setD({ ...d, amountText: e.target.value })} />
        </Field>
        <Field label="Leverantör">
          <input className="input" value={d.supplier ?? ''} onChange={(e) => setD({ ...d, supplier: e.target.value })} />
        </Field>
        <Field label="Förbrukning kWh (valfritt)">
          <input className="input" inputMode="decimal" value={d.kwhText} onChange={(e) => setD({ ...d, kwhText: e.target.value })} />
        </Field>
      </div>
      <Field label="Kommentar">
        <input className="input" value={d.note ?? ''} onChange={(e) => setD({ ...d, note: e.target.value })} />
      </Field>
      <div className="row between">
        {c.id ? (
          <button
            className="btn danger"
            onClick={async () => {
              await db.costs.delete(c.id)
              onClose()
            }}
          >
            Ta bort
          </button>
        ) : (
          <span />
        )}
        <div className="row">
          <button className="btn" onClick={onClose}>
            Avbryt
          </button>
          <button
            className="btn primary"
            disabled={parseAmount(d.amountText) == null || !d.date}
            onClick={async () => {
              const { amountText, kwhText, ...rest } = d
              await db.costs.put({ ...rest, id: c.id || uid(), amount: parseAmount(amountText)!, kwh: parseAmount(kwhText), supplier: d.supplier || undefined, note: d.note || undefined })
              onClose()
            }}
          >
            Spara
          </button>
        </div>
      </div>
    </Modal>
  )
}
