import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Page } from '../components/Layout'
import { Icon, PropAvatar } from '../components/ui'
import { db } from '../db'
import { importBackup } from '../lib/files'
import { fmtKr } from '../lib/format'
import { matchOwner, OWNER_FILTERS, useProperties, type OwnerFilter } from '../lib/hooks'

export default function Overview() {
  const { list, byId } = useProperties()
  const [owner, setOwner] = useState<OwnerFilter>('alla')
  const docs = useLiveQuery(() => db.docs.toArray(), []) ?? []
  const costs = useLiveQuery(() => db.costs.toArray(), []) ?? []
  const loans = useLiveQuery(() => db.loans.toArray(), []) ?? []
  const maint = useLiveQuery(() => db.maintenance.toArray(), []) ?? []
  const vals = useLiveQuery(() => db.valuations.toArray(), []) ?? []

  const [startMsg, setStartMsg] = useState('')
  const loaded = useLiveQuery(() => db.properties.count(), [])
  if (loaded === 0)
    return (
      <Page title="Välkommen" sub="Appen är tom. Dina uppgifter byggs inte in i koden, de läses in här och sparas bara i den här webbläsaren.">
        <section className="card" style={{ maxWidth: 560 }}>
          <h2>Kom igång</h2>
          <p className="muted">Läs in startfilen (mina-fastigheter-startdata.zip) eller en säkerhetskopia du tagit tidigare.</p>
          <label className="btn primary" style={{ alignSelf: 'flex-start' }}>
            <Icon name="upload" /> Läs in startfil
            <input
              type="file"
              accept=".zip"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (!f) return
                setStartMsg('Läser in…')
                try {
                  await importBackup(f)
                  setStartMsg('')
                } catch (err) {
                  setStartMsg(`Kunde inte läsa filen: ${(err as Error).message}`)
                }
              }}
            />
          </label>
          {startMsg && (
            <p role="status" className="notice">
              {startMsg}
            </p>
          )}
          <p className="muted small">
            Vill du börja från noll i stället? Lägg till fastigheter under <Link to="/installningar">Inställningar</Link>.
          </p>
        </section>
      </Page>
    )

  const shown = list.filter((p) => matchOwner(p, owner))
  const ids = new Set(shown.map((p) => p.id))
  const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10)
  // Senaste 12 månader med registrerade kostnader
  const lastDate = costs.reduce((m, c) => (c.date > m ? c.date : m), '')
  const from = lastDate ? new Date(new Date(lastDate).getTime() - 335 * 864e5).toISOString().slice(0, 7) : yearAgo
  const yearCost = costs.filter((c) => ids.has(c.propertyId) && c.date >= from).reduce((s, c) => s + c.amount, 0)
  const debt = loans.filter((l) => ids.has(l.propertyId)).reduce((s, l) => s + l.amount, 0)
  const openMaint = maint.filter((m) => ids.has(m.propertyId) && (m.status === 'planerad' || m.status === 'pågår'))
  const latestVal = (pid: string) => vals.filter((v) => v.propertyId === pid).sort((a, b) => b.date.localeCompare(a.date))[0]
  const recent = docs
    .filter((d) => ids.has(d.propertyId) && (d.date || d.versions.at(-1)?.fileKey))
    .sort((a, b) => (b.date ?? b.createdAt.slice(0, 10)).localeCompare(a.date ?? a.createdAt.slice(0, 10)))
    .slice(0, 6)

  return (
    <Page
      title="Översikt"
      sub="Alla fyra fastigheter på ett ställe. Privat och företag hålls isär men syns tillsammans här."
      actions={
        <div className="seg" role="group" aria-label="Ägarfilter">
          {OWNER_FILTERS.map(([k, l]) => (
            <button key={k} className={owner === k ? 'on' : ''} onClick={() => setOwner(k)}>
              {l}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid" style={{ ['--min' as string]: '200px' }}>
        <div className="card" style={{ gap: 4 }}>
          <span className="kpi-label">Löpande kostnader, senaste 12 mån</span>
          <span className="kpi-value">{fmtKr(yearCost)}</span>
          <span className="muted small">Det som är registrerat i appen</span>
        </div>
        <div className="card" style={{ gap: 4 }}>
          <span className="kpi-label">Total låneskuld</span>
          <span className="kpi-value">{loans.length ? fmtKr(debt) : '–'}</span>
          <span className="muted small">{loans.length ? `${loans.length} lån` : <Link to="/lan">Lägg in lånen</Link>}</span>
        </div>
        <div className="card" style={{ gap: 4 }}>
          <span className="kpi-label">Underhåll planerat eller pågår</span>
          <span className="kpi-value">{openMaint.length} st</span>
          <span className="muted small">Se respektive fastighet</span>
        </div>
        <div className="card" style={{ gap: 4 }}>
          <span className="kpi-label">Dokument</span>
          <span className="kpi-value">{docs.filter((d) => ids.has(d.propertyId)).length} st</span>
          <span className="muted small">Uppladdade och länkade från Dropbox</span>
        </div>
      </div>

      <section className="stack" style={{ gap: 12 }}>
        <h2>Fastigheter</h2>
        <div className="grid">
          {shown.map((p) => {
            const pc = costs.filter((c) => c.propertyId === p.id && c.date >= from).reduce((s, c) => s + c.amount, 0)
            const v = latestVal(p.id)
            const next = maint.find((m) => m.propertyId === p.id && m.status === 'pågår') ?? maint.find((m) => m.propertyId === p.id && m.status === 'planerad')
            return (
              <article key={p.id} className="card">
                <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                  <PropAvatar p={p} />
                  <div className="stack" style={{ gap: 2, minWidth: 0 }}>
                    <h3 style={{ fontSize: 17 }}>{p.name}</h3>
                    <span className="muted">{p.postal}</span>
                  </div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <span className="chip">{p.type}</span>
                  <span className="chip">{p.ownerText}</span>
                </div>
                <dl className="facts" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                  <div>
                    <dt>Kostnad 12 mån</dt>
                    <dd>{pc ? fmtKr(pc) : '–'}</dd>
                  </div>
                  <div>
                    <dt>Senaste värde</dt>
                    <dd>{v ? fmtKr(v.value) : '–'}</dd>
                  </div>
                  <div>
                    <dt>Dokument</dt>
                    <dd>{docs.filter((d) => d.propertyId === p.id).length}</dd>
                  </div>
                </dl>
                <div className="row between" style={{ borderTop: '1px solid var(--line-2)', paddingTop: 10 }}>
                  <span className="muted small">{next ? `${next.status === 'pågår' ? 'Pågår' : 'Nästa'}: ${next.part}` : 'Inget underhåll registrerat'}</span>
                  <Link to={`/fastighet/${p.id}`} style={{ fontWeight: 600, textDecoration: 'none', minHeight: 40, display: 'flex', alignItems: 'center' }}>
                    Öppna →
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <div className="grid" style={{ ['--min' as string]: '340px' }}>
        <section className="card">
          <h2>Pågående och planerat underhåll</h2>
          {openMaint.length === 0 && <p className="muted">Inget registrerat.</p>}
          {openMaint.slice(0, 7).map((m) => (
            <div key={m.id} className="list-row">
              <span className="dot" style={{ background: byId[m.propertyId]?.color }} />
              <div className="stack" style={{ gap: 0, flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 500 }}>{m.part}</span>
                <span className="muted small">{byId[m.propertyId]?.name}</span>
              </div>
              <span className={`chip ${m.status === 'pågår' ? 'accent' : 'info'}`}>{m.status}</span>
            </div>
          ))}
        </section>
        <section className="card">
          <div className="row between">
            <h2>Senaste dokument</h2>
            <Link to="/dokument" style={{ fontWeight: 600, textDecoration: 'none', fontSize: 14 }}>
              Alla dokument →
            </Link>
          </div>
          {recent.map((d) => (
            <div key={d.id} className="list-row">
              <span className="badge-ext">{d.ext.slice(0, 4)}</span>
              <div className="stack" style={{ gap: 0, flex: 1, minWidth: 0 }}>
                <Link to={`/dokument?id=${d.id}`} style={{ color: 'var(--ink)', textDecoration: 'none', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.name}
                </Link>
                <span className="muted small">
                  {byId[d.propertyId]?.name} · {d.category}
                </span>
              </div>
            </div>
          ))}
        </section>
      </div>
    </Page>
  )
}
