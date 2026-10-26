import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Page } from '../components/Layout'
import { Field, Icon, Modal } from '../components/ui'
import { db, uid } from '../db'
import { downloadDoc, fileFor, openDoc, printDoc, zipDocs } from '../lib/files'
import { fmtKr, fmtSize, parseAmount, today } from '../lib/format'
import { matchOwner, OWNER_FILTERS, useProperties, type OwnerFilter } from '../lib/hooks'
import { parseFilename } from '../lib/parseFilename'
import { DOC_CATEGORIES, type Doc } from '../types'

const PAGE = 60

export default function Documents() {
  const { list: props, byId } = useProperties()
  const docs = useLiveQuery(() => db.docs.toArray(), []) ?? []
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [prop, setProp] = useState('alla')
  const [cats, setCats] = useState<string[]>([])
  const [year, setYear] = useState('alla')
  const [owner, setOwner] = useState<OwnerFilter>('alla')
  const [source, setSource] = useState('alla')
  const [sort, setSort] = useState('nyast')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [activeId, setActiveId] = useState<string | null>(params.get('id'))
  const [limit, setLimit] = useState(PAGE)
  const [uploading, setUploading] = useState(params.get('ny') === '1')
  const [editing, setEditing] = useState<Doc | null>(null)

  useEffect(() => {
    setQ(params.get('q') ?? '')
    if (params.get('ny') === '1') setUploading(true)
    if (params.get('id')) setActiveId(params.get('id'))
  }, [params])

  const years = useMemo(() => [...new Set(docs.map((d) => d.date?.slice(0, 4)).filter(Boolean) as string[])].sort().reverse(), [docs])

  const filtered = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean)
    const out = docs.filter((d) => {
      if (prop !== 'alla' && d.propertyId !== prop) return false
      if (!matchOwner(byId[d.propertyId], owner)) return false
      if (cats.length && !cats.includes(d.category)) return false
      if (year !== 'alla' && d.date?.slice(0, 4) !== year) return false
      const hasFile = !!d.versions.at(-1)?.fileKey
      if (source === 'uppladdad' && !hasFile) return false
      if (source === 'dropbox' && hasFile) return false
      if (terms.length) {
        const hay = `${d.name} ${d.ext} ${d.category} ${d.supplier ?? ''} ${d.folder ?? ''} ${d.tags.join(' ')} ${byId[d.propertyId]?.name ?? ''}`.toLowerCase()
        if (!terms.every((t) => hay.includes(t))) return false
      }
      return true
    })
    const key = (d: Doc) => d.date ?? d.createdAt.slice(0, 10)
    out.sort((a, b) =>
      sort === 'nyast' ? key(b).localeCompare(key(a)) : sort === 'aldst' ? key(a).localeCompare(key(b)) : sort === 'belopp' ? (b.amount ?? -1) - (a.amount ?? -1) : a.name.localeCompare(b.name, 'sv'),
    )
    return out
  }, [docs, q, prop, owner, cats, year, source, sort, byId])

  const active = docs.find((d) => d.id === activeId) ?? null
  const selDocs = filtered.filter((d) => selected.has(d.id))
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const allOn = filtered.length > 0 && filtered.every((d) => selected.has(d.id))
  const catCount = (c: string) => docs.filter((d) => d.category === c).length

  return (
    <Page
      title="Dokument"
      sub={`${filtered.length} av ${docs.length} dokument visas. Klicka på en rad för detaljer.`}
      actions={
        <>
          <button className="btn" onClick={() => window.print()}>
            <Icon name="print" /> Skriv ut listan
          </button>
          <button className="btn primary" onClick={() => setUploading(true)}>
            <Icon name="upload" /> Ladda upp
          </button>
        </>
      }
    >
      <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
        <aside className="card no-print" aria-label="Filter" style={{ flex: '1 1 230px', maxWidth: '100%', gap: 16 }}>
          <Field label="Fastighet">
            <select className="input" value={prop} onChange={(e) => setProp(e.target.value)}>
              <option value="alla">Alla fastigheter</option>
              {props.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="field">
            <span className="label">Ägare</span>
            <div className="seg">
              {OWNER_FILTERS.map(([k, l]) => (
                <button key={k} className={owner === k ? 'on' : ''} onClick={() => setOwner(k)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <Field label="År">
            <select className="input" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="alla">Alla år</option>
              {years.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </Field>
          <Field label="Källa">
            <select className="input" value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="alla">Alla</option>
              <option value="uppladdad">Uppladdade i appen</option>
              <option value="dropbox">Länkade från Dropbox</option>
            </select>
          </Field>
          <fieldset style={{ border: 0, margin: 0, padding: 0 }} className="stack">
            <legend className="label" style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Kategori {cats.length > 0 && <button className="btn ghost sm" onClick={() => setCats([])}>Rensa</button>}
            </legend>
            {DOC_CATEGORIES.filter((c) => catCount(c) > 0 || cats.includes(c)).map((c) => (
              <label key={c} className="row" style={{ gap: 8, minHeight: 30, fontSize: 14, flexWrap: 'nowrap' }}>
                <input type="checkbox" checked={cats.includes(c)} onChange={() => setCats((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]))} style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
                <span style={{ flex: 1 }}>{c}</span>
                <span className="muted small">{catCount(c)}</span>
              </label>
            ))}
          </fieldset>
        </aside>

        <section className="card" style={{ flex: '999 1 520px' }} aria-label="Dokumentlista">
          <div className="row no-print">
            <div className="search">
              <Icon name="search" />
              <input
                type="search"
                aria-label="Sök dokument"
                placeholder="Sök i namn, leverantör, mapp och taggar…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setLimit(PAGE)
                  if (params.get('q')) setParams({})
                }}
              />
            </div>
            <select className="input" style={{ width: 'auto' }} aria-label="Sortera" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="nyast">Nyast först</option>
              <option value="aldst">Äldst först</option>
              <option value="namn">Namn A–Ö</option>
              <option value="belopp">Störst belopp</option>
            </select>
          </div>
          {selected.size > 0 && (
            <div className="row notice no-print" style={{ background: 'var(--accent-tint)', color: 'var(--accent-ink)' }}>
              <strong>{selDocs.length} markerade</strong>
              <span className="spacer" />
              <button className="btn sm" onClick={() => zipDocs(selDocs, `dokument-${today()}.zip`)}>
                <Icon name="download" /> Ladda ned som ZIP
              </button>
              <button className="btn sm" onClick={() => setSelected(new Set())}>
                Avmarkera
              </button>
            </div>
          )}
          <h2 className="print-only">Dokumentlista {today()}</h2>
          <div className="table-wrap">
            <table className="t" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th className="no-print" style={{ width: 30 }}>
                    <input type="checkbox" aria-label="Markera alla som visas" checked={allOn} onChange={() => setSelected(allOn ? new Set() : new Set(filtered.map((d) => d.id)))} style={{ width: 18, height: 18 }} />
                  </th>
                  <th>Namn</th>
                  <th>Fastighet</th>
                  <th>Kategori</th>
                  <th>Datum</th>
                  <th className="num">Belopp</th>
                  <th>Ver.</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, limit).map((d) => (
                  <tr key={d.id} className={`click${d.id === activeId ? ' sel' : ''}`} onClick={() => setActiveId(d.id)}>
                    <td className="no-print" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" aria-label={`Markera ${d.name}`} checked={selected.has(d.id)} onChange={() => toggle(d.id)} style={{ width: 18, height: 18 }} />
                    </td>
                    <td>
                      <div className="row" style={{ flexWrap: 'nowrap', gap: 10 }}>
                        <span className="badge-ext">{d.ext.slice(0, 4) || '–'}</span>
                        <span style={{ fontWeight: 500 }}>{d.name}</span>
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                        <span className="dot" style={{ background: byId[d.propertyId]?.color }} />
                        {byId[d.propertyId]?.name}
                      </span>
                    </td>
                    <td>{d.category}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{d.date ?? '–'}</td>
                    <td className="num">{d.amount != null ? fmtKr(d.amount) : '–'}</td>
                    <td>
                      <span className="chip">v{d.versions.length}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <div className="empty">Inga dokument matchar filtret.</div>}
          {filtered.length > limit && (
            <button className="btn no-print" onClick={() => setLimit((l) => l + PAGE)}>
              Visa fler ({filtered.length - limit} kvar)
            </button>
          )}
        </section>

        {active && <DocPanel doc={active} propName={byId[active.propertyId]?.name ?? ''} onEdit={() => setEditing(active)} onClose={() => setActiveId(null)} />}
      </div>

      {uploading && (
        <UploadModal
          onClose={() => {
            setUploading(false)
            if (params.get('ny')) setParams({})
          }}
        />
      )}
      {editing && <EditModal doc={editing} onClose={() => setEditing(null)} />}
    </Page>
  )
}

function DocPanel({ doc, propName, onEdit, onClose }: { doc: Doc; propName: string; onEdit: () => void; onClose: () => void }) {
  const file = useLiveQuery(() => fileFor(doc), [doc])
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!file) return setUrl(undefined)
    const u = URL.createObjectURL(file.blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])

  async function newVersion(f: File) {
    const key = uid()
    await db.files.add({ key, blob: f, name: f.name, type: f.type })
    await db.docs.update(doc.id, { versions: [...doc.versions, { v: doc.versions.length + 1, date: today(), note: f.name, size: f.size, fileKey: key }] })
  }

  return (
    <aside className="card no-print" aria-label="Dokumentdetaljer" style={{ flex: '1 1 300px', maxWidth: '100%' }}>
      <div className="row between" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <div className="stack" style={{ gap: 2, minWidth: 0 }}>
          <h2 style={{ wordBreak: 'break-word' }}>{doc.name}</h2>
          <span className="muted small">
            {propName} · {doc.category}
          </span>
        </div>
        <button className="btn ghost icon-btn" aria-label="Stäng detaljer" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      {url && file?.type.startsWith('image/') && <img src={url} alt={doc.name} style={{ width: '100%', borderRadius: 10, border: '1px solid var(--line)' }} />}
      {url && file?.type === 'application/pdf' && <iframe title={`Förhandsvisning av ${doc.name}`} src={url} style={{ width: '100%', height: 320, border: '1px solid var(--line)', borderRadius: 10 }} />}
      {!file && doc.dropboxUrl && <div className="notice">Filen ligger i Dropbox. Öppna, skriv ut och ladda ned görs där.</div>}
      <dl className="facts" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <div>
          <dt>Datum</dt>
          <dd>{doc.date ?? '–'}</dd>
        </div>
        <div>
          <dt>Belopp</dt>
          <dd>{fmtKr(doc.amount)}</dd>
        </div>
        <div>
          <dt>Leverantör</dt>
          <dd>{doc.supplier ?? '–'}</dd>
        </div>
        <div>
          <dt>Filtyp</dt>
          <dd>{doc.ext || '–'}</dd>
        </div>
      </dl>
      {doc.folder && <p className="muted small">Mapp: {doc.folder}</p>}
      {doc.tags.length > 0 && (
        <div className="row" style={{ gap: 6 }}>
          {doc.tags.map((t) => (
            <span key={t} className="chip">
              {t}
            </span>
          ))}
        </div>
      )}
      <div className="grid" style={{ ['--min' as string]: '90px', gap: 6 }}>
        <button className="btn sm" onClick={() => openDoc(doc)}>
          <Icon name="open" /> Öppna
        </button>
        <button className="btn sm" onClick={() => printDoc(doc)}>
          <Icon name="print" /> Skriv ut
        </button>
        <button className="btn sm" onClick={() => downloadDoc(doc)}>
          <Icon name="download" /> Ladda ned
        </button>
      </div>
      <div className="stack" style={{ gap: 0 }}>
        <span className="label" style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
          Versioner
        </span>
        {[...doc.versions].reverse().map((v, i) => (
          <div key={v.v} className="list-row small" style={{ padding: '7px 0' }}>
            <strong>v{v.v}</strong>
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {i === 0 ? 'Gällande · ' : ''}
              {v.note}
            </span>
            <span className="muted">{v.size ? fmtSize(v.size) : ''}</span>
          </div>
        ))}
        <label className="btn sm" style={{ marginTop: 8, borderStyle: 'dashed' }}>
          <Icon name="upload" /> Ladda upp ny version
          <input type="file" hidden onChange={(e) => e.target.files?.[0] && newVersion(e.target.files[0])} />
        </label>
      </div>
      <div className="row">
        <button className="btn sm" onClick={onEdit}>
          <Icon name="edit" /> Ändra uppgifter
        </button>
        <button
          className="btn sm danger"
          onClick={async () => {
            if (!confirm(`Ta bort "${doc.name}" ur appen? Filer i Dropbox påverkas inte.`)) return
            await db.files.bulkDelete(doc.versions.map((v) => v.fileKey).filter(Boolean) as string[])
            await db.docs.delete(doc.id)
            onClose()
          }}
        >
          <Icon name="trash" /> Ta bort
        </button>
      </div>
    </aside>
  )
}

interface Pending {
  file: File
  name: string
  date: string
  amount: string
  supplier: string
  category: string
}

function UploadModal({ onClose }: { onClose: () => void }) {
  const { list: props } = useProperties()
  const [propertyId, setPropertyId] = useState('')
  const [items, setItems] = useState<Pending[]>([])
  const [over, setOver] = useState(false)
  const [saving, setSaving] = useState(false)

  function add(files: FileList | null) {
    if (!files) return
    const picked = [...files]
    setItems((s) => [
      ...s,
      ...picked.map((file) => {
        const p = parseFilename(file.name)
        return { file, name: p.name, date: p.date ?? '', amount: p.amount != null ? String(p.amount) : '', supplier: p.supplier ?? '', category: p.category ?? 'Övrigt' }
      }),
    ])
  }
  const set = (i: number, patch: Partial<Pending>) => setItems((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)))

  async function save() {
    if (!propertyId) return alert('Välj fastighet först.')
    setSaving(true)
    for (const it of items) {
      const key = uid()
      await db.files.add({ key, blob: it.file, name: it.file.name, type: it.file.type })
      const ext = it.file.name.includes('.') ? it.file.name.split('.').pop()!.toUpperCase() : ''
      await db.docs.add({
        id: uid(),
        propertyId,
        name: it.name,
        ext,
        category: it.category,
        date: it.date || undefined,
        amount: parseAmount(it.amount),
        supplier: it.supplier || undefined,
        tags: [],
        versions: [{ v: 1, date: today(), note: it.file.name, size: it.file.size, fileKey: key }],
        createdAt: new Date().toISOString(),
      })
    }
    onClose()
  }

  return (
    <Modal title="Ladda upp dokument" onClose={onClose} wide>
      <Field label="Fastighet">
        <select className="input" value={propertyId} onChange={(e) => setPropertyId(e.target.value)} required>
          <option value="">Välj fastighet</option>
          {props.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <label
        className={`drop${over ? ' over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          add(e.dataTransfer.files)
        }}
      >
        <strong>Dra filer hit eller klicka för att välja</strong>
        <br />
        <span className="small">Datum, leverantör och belopp läses ur filnamnet, t.ex. "2025-03-13. Hammarö Eltjänst (45 637 kr).pdf"</span>
        <input
          type="file"
          multiple
          hidden
          onChange={(e) => {
            add(e.target.files)
            e.target.value = ''
          }}
        />
      </label>
      {items.length > 0 && (
        <div className="table-wrap">
          <table className="t" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th>Namn</th>
                <th>Kategori</th>
                <th>Datum</th>
                <th>Leverantör</th>
                <th>Belopp kr</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td>
                    <input className="input" aria-label="Namn" value={it.name} onChange={(e) => set(i, { name: e.target.value })} />
                  </td>
                  <td>
                    <select className="input" aria-label="Kategori" value={it.category} onChange={(e) => set(i, { category: e.target.value })}>
                      {DOC_CATEGORIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input className="input" type="date" aria-label="Datum" value={it.date} onChange={(e) => set(i, { date: e.target.value })} />
                  </td>
                  <td>
                    <input className="input" aria-label="Leverantör" value={it.supplier} onChange={(e) => set(i, { supplier: e.target.value })} />
                  </td>
                  <td>
                    <input className="input" inputMode="decimal" aria-label="Belopp" value={it.amount} onChange={(e) => set(i, { amount: e.target.value })} style={{ width: 110 }} />
                  </td>
                  <td>
                    <button className="btn ghost icon-btn" aria-label="Ta bort raden" onClick={() => setItems((s) => s.filter((_, j) => j !== i))}>
                      <Icon name="close" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onClose}>
          Avbryt
        </button>
        <button className="btn primary" disabled={!items.length || saving} onClick={save}>
          Spara {items.length || ''} {items.length === 1 ? 'dokument' : 'dokument'}
        </button>
      </div>
    </Modal>
  )
}

function EditModal({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const { list: props } = useProperties()
  const [d, setD] = useState({ ...doc, amountText: doc.amount != null ? String(doc.amount) : '', tagText: doc.tags.join(', ') })
  return (
    <Modal title="Ändra dokument" onClose={onClose}>
      <Field label="Namn">
        <input className="input" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
      </Field>
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
          <select className="input" value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })}>
            {DOC_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Datum">
          <input className="input" type="date" value={d.date ?? ''} onChange={(e) => setD({ ...d, date: e.target.value })} />
        </Field>
        <Field label="Belopp (kr)">
          <input className="input" inputMode="decimal" value={d.amountText} onChange={(e) => setD({ ...d, amountText: e.target.value })} />
        </Field>
        <Field label="Leverantör">
          <input className="input" value={d.supplier ?? ''} onChange={(e) => setD({ ...d, supplier: e.target.value })} />
        </Field>
        <Field label="Taggar (kommatecken mellan)">
          <input className="input" value={d.tagText} onChange={(e) => setD({ ...d, tagText: e.target.value })} />
        </Field>
      </div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onClose}>
          Avbryt
        </button>
        <button
          className="btn primary"
          onClick={async () => {
            await db.docs.update(doc.id, {
              name: d.name,
              propertyId: d.propertyId,
              category: d.category,
              date: d.date || undefined,
              amount: parseAmount(d.amountText),
              supplier: d.supplier || undefined,
              tags: d.tagText
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
            })
            onClose()
          }}
        >
          Spara
        </button>
      </div>
    </Modal>
  )
}
