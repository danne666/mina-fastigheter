import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Field, Icon, Modal, PropAvatar, StackedBars } from '../components/ui'
import { db, uid } from '../db'
import { zipDocs } from '../lib/files'
import { fmtKr, fmtNum, MONTHS, parseAmount, today } from '../lib/format'
import type { Fact, Maintenance, MaintStatus, Property } from '../types'

const STATUS: MaintStatus[] = ['pågår', 'planerad', 'bevaka', 'ok', 'klar']
const statusChip: Record<MaintStatus, string> = { pågår: 'accent', planerad: 'info', bevaka: 'warn', ok: '', klar: '' }

export default function PropertyPage() {
  const { id = '' } = useParams()
  const p = useLiveQuery(() => db.properties.get(id), [id])
  const docs = useLiveQuery(() => db.docs.where('propertyId').equals(id).toArray(), [id]) ?? []
  const costs = useLiveQuery(() => db.costs.where('propertyId').equals(id).toArray(), [id]) ?? []
  const maint = useLiveQuery(() => db.maintenance.where('propertyId').equals(id).toArray(), [id]) ?? []
  const loans = useLiveQuery(() => db.loans.where('propertyId').equals(id).toArray(), [id]) ?? []
  const vals = useLiveQuery(() => db.valuations.where('propertyId').equals(id).sortBy('date'), [id]) ?? []
  const [editFacts, setEditFacts] = useState(false)
  const [editMaint, setEditMaint] = useState<Maintenance | null>(null)
  const [metric, setMetric] = useState<'kr' | 'kwh'>('kr')

  if (!p) return <div className="content">Laddar…</div>

  // Senaste 12 månaderna med el
  const el = costs.filter((c) => c.category === 'El').sort((a, b) => a.date.localeCompare(b.date))
  const months = [...new Set(el.map((c) => c.date.slice(0, 7)))].slice(-12)
  const elVals = months.map((m): Record<string, number> => {
    const rows = el.filter((c) => c.date.startsWith(m))
    return metric === 'kr'
      ? { Elhandel: rows.filter((r) => r.note !== 'Elnät').reduce((s, r) => s + r.amount, 0), Elnät: rows.filter((r) => r.note === 'Elnät').reduce((s, r) => s + r.amount, 0) }
      : { kWh: rows.reduce((s, r) => s + (r.kwh ?? 0), 0) }
  })
  const byCat = Object.entries(
    costs.reduce<Record<string, number>>((acc, c) => {
      acc[c.category] = (acc[c.category] ?? 0) + c.amount
      return acc
    }, {}),
  ).sort((a, b) => b[1] - a[1])
  const sumAll = byCat.reduce((s, [, v]) => s + v, 0)

  return (
    <div className="content">
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <PropAvatar p={p} size={52} />
          <div className="stack" style={{ gap: 6 }}>
            <h1>{p.name}</h1>
            <div className="row" style={{ gap: 6 }}>
              <span className="muted">
                {p.postal}, {p.municipality} kommun
              </span>
              <span className="chip">{p.type}</span>
              <span className="chip accent">{p.ownerText}</span>
            </div>
          </div>
        </div>
        <div className="row no-print">
          <button className="btn" onClick={() => window.print()}>
            <Icon name="print" /> Skriv ut sammanställning
          </button>
          <button className="btn" onClick={() => zipDocs(docs, `${p.name}-${today()}.zip`)} disabled={!docs.length}>
            <Icon name="download" /> Ladda ned alla dokument
          </button>
          <Link className="btn primary" to={`/dokument?ny=1`}>
            <Icon name="upload" /> Ladda upp
          </Link>
        </div>
      </div>

      <div className="grid">
        <section className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="row between">
            <h2>Fastighetsfakta</h2>
            <button className="btn sm no-print" onClick={() => setEditFacts(true)}>
              <Icon name="edit" /> Ändra
            </button>
          </div>
          {p.facts.length === 0 ? (
            <div className="empty">Inga uppgifter ännu. Klicka på Ändra och fyll i fastighetsbeteckning, byggår, ytor med mera.</div>
          ) : (
            <dl className="facts">
              {p.facts.map((f) => (
                <div key={f.label} title={f.source ? `Källa: ${f.source}` : undefined}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {p.dropboxFolder && (
            <p className="muted small">
              Dokumenten är länkade från Dropbox-mappen "{p.dropboxFolder.replace(/^\/|\/$/g, '')}". {p.photoCount ? `Där finns också ${fmtNum(p.photoCount)} foton och filmer.` : ''}
            </p>
          )}
        </section>

        <section className="card">
          <div className="row between">
            <h2>El per månad</h2>
            <div className="seg no-print">
              <button className={metric === 'kr' ? 'on' : ''} onClick={() => setMetric('kr')}>
                Kronor
              </button>
              <button className={metric === 'kwh' ? 'on' : ''} onClick={() => setMetric('kwh')}>
                kWh
              </button>
            </div>
          </div>
          {months.length === 0 ? (
            <div className="empty">Ingen elförbrukning registrerad. Lägg in under Ekonomi.</div>
          ) : (
            <>
              <StackedBars
                labels={months.map((m) => `${MONTHS[+m.slice(5) - 1]} ${m.slice(2, 4)}`)}
                values={elVals}
                unit={metric === 'kr' ? 'kr' : 'kWh'}
                series={metric === 'kr' ? [{ key: 'Elnät', color: '#8C99A4' }, { key: 'Elhandel', color: '#1F6F5C' }] : [{ key: 'kWh', color: '#3B82C4' }]}
              />
              {metric === 'kr' ? (
                <div className="legend">
                  <span>
                    <i style={{ background: '#1F6F5C' }} />
                    Elhandel
                  </span>
                  <span>
                    <i style={{ background: '#8C99A4' }} />
                    Elnät
                  </span>
                </div>
              ) : (
                <p className="muted small">Månader utan staplar saknar kWh-uppgift.</p>
              )}
            </>
          )}
        </section>

        <section className="card">
          <div className="row between">
            <h2>Kostnader per kategori, allt registrerat</h2>
            <Link to="/ekonomi" className="small" style={{ fontWeight: 600, textDecoration: 'none' }}>
              Ekonomi →
            </Link>
          </div>
          {byCat.length === 0 && <div className="empty">Inga kostnader ännu.</div>}
          {byCat.map(([k, v]) => (
            <div key={k} className="list-row" style={{ padding: '7px 0' }}>
              <span style={{ flex: 1 }}>{k}</span>
              <strong>{fmtKr(v)}</strong>
            </div>
          ))}
          {sumAll > 0 && (
            <div className="row between" style={{ fontWeight: 700 }}>
              <span>Summa</span>
              <span>{fmtKr(sumAll)}</span>
            </div>
          )}
        </section>

        <section className="card">
          <h2>Värde och lån</h2>
          {vals.length === 0 && loans.length === 0 && <div className="empty">Inget registrerat.</div>}
          {vals.map((v) => (
            <div key={v.id} className="list-row" style={{ padding: '7px 0' }}>
              <span className="muted small" style={{ width: 86 }}>
                {v.date}
              </span>
              <span style={{ flex: 1 }}>{v.source}</span>
              <strong>{fmtKr(v.value)}</strong>
            </div>
          ))}
          {loans.map((l) => (
            <div key={l.id} className="list-row" style={{ padding: '7px 0' }}>
              <span style={{ flex: 1 }}>
                Lån {l.lender}, {String(l.rate).replace('.', ',')} %
              </span>
              <strong>{fmtKr(l.amount)}</strong>
            </div>
          ))}
          <Link to="/lan" className="small no-print" style={{ fontWeight: 600, textDecoration: 'none' }}>
            Lägg till lån eller värdering →
          </Link>
        </section>

        <section className="card">
          <div className="row between">
            <h2>Dokument</h2>
            <Link to={`/dokument?q=${encodeURIComponent(p.name)}`} className="small" style={{ fontWeight: 600, textDecoration: 'none' }}>
              Alla {docs.length} →
            </Link>
          </div>
          {Object.entries(
            docs.reduce<Record<string, number>>((a, d) => {
              a[d.category] = (a[d.category] ?? 0) + 1
              return a
            }, {}),
          )
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([c, n]) => (
              <div key={c} className="list-row" style={{ padding: '6px 0' }}>
                <span style={{ flex: 1 }}>{c}</span>
                <span className="muted">{n}</span>
              </div>
            ))}
          {docs.length === 0 && <div className="empty">Inga dokument ännu.</div>}
        </section>
      </div>

      <section className="card" id="underhall">
        <div className="row between">
          <h2>Underhåll och åtgärder</h2>
          <button className="btn sm no-print" onClick={() => setEditMaint({ id: '', propertyId: p.id, part: '', status: 'planerad' })}>
            <Icon name="plus" /> Ny åtgärd
          </button>
        </div>
        <div className="table-wrap">
          <table className="t" style={{ minWidth: 680 }}>
            <thead>
              <tr>
                <th>Byggdel</th>
                <th>Status</th>
                <th>Senast</th>
                <th>Nästa</th>
                <th className="num">Beräknad kostnad</th>
                <th>Kommentar</th>
              </tr>
            </thead>
            <tbody>
              {[...maint]
                .sort((a, b) => STATUS.indexOf(a.status) - STATUS.indexOf(b.status))
                .map((m) => (
                  <tr key={m.id} className="click" onClick={() => setEditMaint(m)}>
                    <td style={{ fontWeight: 500 }}>{m.part}</td>
                    <td>
                      <span className={`chip ${statusChip[m.status]}`}>{m.status}</span>
                    </td>
                    <td>{m.lastDone ?? '–'}</td>
                    <td>{m.nextYear ?? '–'}</td>
                    <td className="num">{fmtKr(m.estCost)}</td>
                    <td className="muted small">{m.note}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {maint.length === 0 && <div className="empty">Inga åtgärder registrerade.</div>}
      </section>

      {editFacts && <FactsModal p={p} onClose={() => setEditFacts(false)} />}
      {editMaint && <MaintModal m={editMaint} onClose={() => setEditMaint(null)} />}
    </div>
  )
}

function FactsModal({ p, onClose }: { p: Property; onClose: () => void }) {
  const [facts, setFacts] = useState<Fact[]>(p.facts.length ? p.facts : [{ label: 'Fastighetsbeteckning', value: '' }])
  const [base, setBase] = useState({ type: p.type, ownerText: p.ownerText, postal: p.postal, municipality: p.municipality })
  const set = (i: number, patch: Partial<Fact>) => setFacts((s) => s.map((f, j) => (j === i ? { ...f, ...patch } : f)))
  return (
    <Modal title={`Fakta om ${p.name}`} onClose={onClose} wide>
      <div className="grid" style={{ ['--min' as string]: '180px', gap: 12 }}>
        <Field label="Typ">
          <input className="input" value={base.type} onChange={(e) => setBase({ ...base, type: e.target.value })} />
        </Field>
        <Field label="Ägare">
          <input className="input" value={base.ownerText} onChange={(e) => setBase({ ...base, ownerText: e.target.value })} />
        </Field>
        <Field label="Postnummer och ort">
          <input className="input" value={base.postal} onChange={(e) => setBase({ ...base, postal: e.target.value })} />
        </Field>
        <Field label="Kommun">
          <input className="input" value={base.municipality} onChange={(e) => setBase({ ...base, municipality: e.target.value })} />
        </Field>
      </div>
      <div className="stack" style={{ gap: 8, maxHeight: '45vh', overflowY: 'auto' }}>
        {facts.map((f, i) => (
          <div key={i} className="row" style={{ flexWrap: 'nowrap' }}>
            <input className="input" aria-label="Rubrik" value={f.label} onChange={(e) => set(i, { label: e.target.value })} style={{ flex: '1 1 40%' }} />
            <input className="input" aria-label="Värde" value={f.value} onChange={(e) => set(i, { value: e.target.value })} style={{ flex: '1 1 60%' }} />
            <button className="btn ghost icon-btn" aria-label="Ta bort rad" onClick={() => setFacts((s) => s.filter((_, j) => j !== i))}>
              <Icon name="close" />
            </button>
          </div>
        ))}
      </div>
      <div className="row between">
        <button className="btn sm" onClick={() => setFacts((s) => [...s, { label: '', value: '' }])}>
          <Icon name="plus" /> Ny rad
        </button>
        <div className="row">
          <button className="btn" onClick={onClose}>
            Avbryt
          </button>
          <button
            className="btn primary"
            onClick={async () => {
              await db.properties.update(p.id, { ...base, facts: facts.filter((f) => f.label.trim()) })
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

function MaintModal({ m, onClose }: { m: Maintenance; onClose: () => void }) {
  const [d, setD] = useState({ ...m, cost: m.estCost != null ? String(m.estCost) : '' })
  return (
    <Modal title={m.id ? 'Ändra åtgärd' : 'Ny åtgärd'} onClose={onClose}>
      <Field label="Byggdel eller åtgärd">
        <input className="input" value={d.part} onChange={(e) => setD({ ...d, part: e.target.value })} />
      </Field>
      <div className="grid" style={{ ['--min' as string]: '150px', gap: 12 }}>
        <Field label="Status">
          <select className="input" value={d.status} onChange={(e) => setD({ ...d, status: e.target.value as MaintStatus })}>
            {STATUS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Senast åtgärdad">
          <input className="input" value={d.lastDone ?? ''} placeholder="år" onChange={(e) => setD({ ...d, lastDone: e.target.value })} />
        </Field>
        <Field label="Nästa gång">
          <input className="input" value={d.nextYear ?? ''} placeholder="år" onChange={(e) => setD({ ...d, nextYear: e.target.value })} />
        </Field>
        <Field label="Beräknad kostnad (kr)">
          <input className="input" inputMode="decimal" value={d.cost} onChange={(e) => setD({ ...d, cost: e.target.value })} />
        </Field>
      </div>
      <Field label="Kommentar">
        <textarea className="input" value={d.note ?? ''} onChange={(e) => setD({ ...d, note: e.target.value })} />
      </Field>
      <div className="row between">
        {m.id ? (
          <button
            className="btn danger"
            onClick={async () => {
              await db.maintenance.delete(m.id)
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
            disabled={!d.part.trim()}
            onClick={async () => {
              const { cost, ...rest } = d
              await db.maintenance.put({ ...rest, id: m.id || uid(), estCost: parseAmount(cost), lastDone: d.lastDone || undefined, nextYear: d.nextYear || undefined })
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
