import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Page } from '../components/Layout'
import { Field, Icon, Modal } from '../components/ui'
import { db, uid } from '../db'
import type { Material } from '../types'

export default function Materials() {
  const mats = useLiveQuery(() => db.materials.toArray(), []) ?? []
  const [loc, setLoc] = useState('alla')
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState<Material | null>(null)
  const locations = [...new Set(mats.map((m) => m.location))].sort((a, b) => a.localeCompare(b, 'sv'))
  const shown = mats
    .filter((m) => (loc === 'alla' || m.location === loc) && `${m.name} ${m.note ?? ''}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.location.localeCompare(b.location, 'sv') || a.name.localeCompare(b.name, 'sv'))

  return (
    <Page
      title="Materiallager"
      sub="Byggmaterial du har på lager och var det står. Startlistan kommer från ditt Excelark för Ringvägen 33."
      actions={
        <>
          <button className="btn" onClick={() => window.print()}>
            <Icon name="print" /> Skriv ut
          </button>
          <button className="btn primary" onClick={() => setEdit({ id: '', name: '', qty: '', location: loc === 'alla' ? '' : loc })}>
            <Icon name="plus" /> Nytt material
          </button>
        </>
      }
    >
      <div className="row no-print">
        <div className="search">
          <Icon name="search" />
          <input type="search" aria-label="Sök material" placeholder="Sök material…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input" style={{ width: 'auto' }} aria-label="Plats" value={loc} onChange={(e) => setLoc(e.target.value)}>
          <option value="alla">Alla platser</option>
          {locations.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </div>
      <section className="card">
        <div className="table-wrap">
          <table className="t" style={{ minWidth: 600 }}>
            <thead>
              <tr>
                <th>Material</th>
                <th>Antal</th>
                <th>Plats</th>
                <th>Pris</th>
                <th>Kommentar</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((m) => (
                <tr key={m.id} className="click" onClick={() => setEdit(m)}>
                  <td style={{ fontWeight: 500 }}>{m.name}</td>
                  <td>{m.qty}</td>
                  <td>
                    <span className="chip">{m.location}</span>
                  </td>
                  <td>{m.unitPrice ?? '–'}</td>
                  <td className="muted small">{m.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {shown.length === 0 && <div className="empty">Inget material hittades.</div>}
      </section>
      {edit && <MatModal m={edit} locations={locations} onClose={() => setEdit(null)} />}
    </Page>
  )
}

function MatModal({ m, locations, onClose }: { m: Material; locations: string[]; onClose: () => void }) {
  const [d, setD] = useState(m)
  return (
    <Modal title={m.id ? 'Ändra material' : 'Nytt material'} onClose={onClose}>
      <Field label="Material">
        <input className="input" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
      </Field>
      <div className="grid" style={{ ['--min' as string]: '150px', gap: 12 }}>
        <Field label="Antal">
          <input className="input" value={d.qty} onChange={(e) => setD({ ...d, qty: e.target.value })} />
        </Field>
        <Field label="Plats">
          <input className="input" list="platser" value={d.location} onChange={(e) => setD({ ...d, location: e.target.value })} />
          <datalist id="platser">
            {locations.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </Field>
        <Field label="Pris">
          <input className="input" value={d.unitPrice ?? ''} onChange={(e) => setD({ ...d, unitPrice: e.target.value })} />
        </Field>
      </div>
      <Field label="Kommentar">
        <input className="input" value={d.note ?? ''} onChange={(e) => setD({ ...d, note: e.target.value })} />
      </Field>
      <div className="row between">
        {m.id ? (
          <button className="btn danger" onClick={async () => (await db.materials.delete(m.id), onClose())}>
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
            disabled={!d.name.trim() || !d.location.trim()}
            onClick={async () => {
              await db.materials.put({ ...d, id: m.id || uid(), unitPrice: d.unitPrice || undefined, note: d.note || undefined })
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
