import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Page } from '../components/Layout'
import { Field, Icon, Modal } from '../components/ui'
import { db, uid } from '../db'
import { fmtKr, parseAmount } from '../lib/format'
import { useProperties } from '../lib/hooks'
import type { Phase, Project, ProjectItem } from '../types'

const NEXT: Record<Phase['state'], Phase['state']> = { kvar: 'pågår', pågår: 'klar', klar: 'kvar' }

export default function Projects() {
  const { list: props, byId } = useProperties()
  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? []
  const items = useLiveQuery(() => db.projectItems.toArray(), []) ?? []
  const [editItem, setEditItem] = useState<ProjectItem | null>(null)
  const [newProj, setNewProj] = useState(false)

  return (
    <Page
      title="Projekt och bygglov"
      sub="Budget mot utfall per projekt. Klicka på ett steg för att ändra status."
      actions={
        <button className="btn primary" onClick={() => setNewProj(true)}>
          <Icon name="plus" /> Nytt projekt
        </button>
      }
    >
      {projects.map((pr) => {
        const its = items.filter((i) => i.projectId === pr.id)
        const budget = its.reduce((s, i) => s + (i.budget ?? 0), 0)
        const actual = its.reduce((s, i) => s + (i.actual ?? 0), 0)
        const p = byId[pr.propertyId]
        return (
          <section key={pr.id} className="card">
            <div className="row between" style={{ alignItems: 'flex-start' }}>
              <div className="stack" style={{ gap: 2 }}>
                <h2>{pr.name}</h2>
                <span className="muted small">
                  <span className="dot" style={{ background: p?.color, marginRight: 6 }} />
                  {p?.name}
                  {pr.split && ` · delas ${pr.split.map((s) => `${s.name} ${s.share} %`).join(', ')}`}
                </span>
              </div>
              <div className="row">
                <span className="chip">Budget {fmtKr(budget || undefined)}</span>
                <span className="chip accent">Utfall {fmtKr(actual || undefined)}</span>
              </div>
            </div>
            {pr.note && <p className="muted small">{pr.note}</p>}
            <ol className="steps" aria-label="Projektets steg">
              {pr.phases.map((ph, i) => (
                <li
                  key={i}
                  className={ph.state}
                  title="Klicka för att ändra status"
                  onClick={() => db.projects.update(pr.id, { phases: pr.phases.map((x, j) => (j === i ? { ...x, state: NEXT[x.state] } : x)) })}
                >
                  {ph.name}
                  <div style={{ fontWeight: 400, fontSize: 12 }}>{ph.state}</div>
                </li>
              ))}
            </ol>
            <div className="table-wrap">
              <table className="t" style={{ minWidth: 640 }}>
                <thead>
                  <tr>
                    <th>Post</th>
                    <th>Leverantör</th>
                    <th className="num">Budget</th>
                    <th className="num">Utfall</th>
                    {pr.split?.map((s) => (
                      <th key={s.name} className="num">
                        {s.name}s andel
                      </th>
                    ))}
                    <th>Kommentar</th>
                  </tr>
                </thead>
                <tbody>
                  {its.map((i) => (
                    <tr key={i.id} className="click" onClick={() => setEditItem(i)}>
                      <td style={{ fontWeight: 500 }}>{i.post}</td>
                      <td>{i.supplier ?? '–'}</td>
                      <td className="num">{fmtKr(i.budget)}</td>
                      <td className="num">{fmtKr(i.actual)}</td>
                      {pr.split?.map((s) => (
                        <td key={s.name} className="num">
                          {fmtKr(i.actual != null ? (i.actual * s.share) / 100 : undefined)}
                        </td>
                      ))}
                      <td className="muted small">{i.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setEditItem({ id: '', projectId: pr.id, post: '' })}>
              <Icon name="plus" /> Ny post
            </button>
          </section>
        )
      })}
      {projects.length === 0 && <div className="empty">Inga projekt ännu.</div>}
      {editItem && <ItemModal it={editItem} onClose={() => setEditItem(null)} />}
      {newProj && <ProjectModal props={props} onClose={() => setNewProj(false)} />}
    </Page>
  )
}

function ItemModal({ it, onClose }: { it: ProjectItem; onClose: () => void }) {
  const [d, setD] = useState({ ...it, b: it.budget != null ? String(it.budget) : '', a: it.actual != null ? String(it.actual) : '' })
  return (
    <Modal title={it.id ? 'Ändra post' : 'Ny post'} onClose={onClose}>
      <Field label="Post">
        <input className="input" value={d.post} onChange={(e) => setD({ ...d, post: e.target.value })} />
      </Field>
      <div className="grid" style={{ ['--min' as string]: '150px', gap: 12 }}>
        <Field label="Leverantör">
          <input className="input" value={d.supplier ?? ''} onChange={(e) => setD({ ...d, supplier: e.target.value })} />
        </Field>
        <Field label="Budget (kr)">
          <input className="input" inputMode="numeric" value={d.b} onChange={(e) => setD({ ...d, b: e.target.value })} />
        </Field>
        <Field label="Utfall (kr)">
          <input className="input" inputMode="numeric" value={d.a} onChange={(e) => setD({ ...d, a: e.target.value })} />
        </Field>
      </div>
      <Field label="Kommentar">
        <input className="input" value={d.note ?? ''} onChange={(e) => setD({ ...d, note: e.target.value })} />
      </Field>
      <div className="row between">
        {it.id ? (
          <button className="btn danger" onClick={async () => (await db.projectItems.delete(it.id), onClose())}>
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
            disabled={!d.post.trim()}
            onClick={async () => {
              await db.projectItems.put({ id: it.id || uid(), projectId: it.projectId, post: d.post, supplier: d.supplier || undefined, budget: parseAmount(d.b), actual: parseAmount(d.a), note: d.note || undefined })
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

function ProjectModal({ props, onClose }: { props: { id: string; name: string }[]; onClose: () => void }) {
  const [name, setName] = useState('')
  const [propertyId, setPropertyId] = useState(props[0]?.id ?? '')
  const [phases, setPhases] = useState('Planering, Offerter, Bygglov, Utförande, Slutbesiktning')
  return (
    <Modal title="Nytt projekt" onClose={onClose}>
      <Field label="Namn">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Fastighet">
        <select className="input" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
          {props.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Steg (kommatecken mellan)">
        <input className="input" value={phases} onChange={(e) => setPhases(e.target.value)} />
      </Field>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onClose}>
          Avbryt
        </button>
        <button
          className="btn primary"
          disabled={!name.trim()}
          onClick={async () => {
            const p: Project = {
              id: uid(),
              propertyId,
              name,
              phases: phases
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
                .map((n) => ({ name: n, state: 'kvar' })),
            }
            // Delad ägo: ta samma fördelning som fastighetens tidigare projekt
            const prev = (await db.projects.where('propertyId').equals(propertyId).toArray()).find((x) => x.split)
            if (prev?.split) p.split = prev.split
            await db.projects.add(p)
            onClose()
          }}
        >
          Skapa
        </button>
      </div>
    </Modal>
  )
}
