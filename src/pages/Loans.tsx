import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Page } from '../components/Layout'
import { Field, Icon, Modal } from '../components/ui'
import { db, uid } from '../db'
import { fmtKr, parseAmount, today } from '../lib/format'
import { useProperties } from '../lib/hooks'
import type { Loan, Valuation } from '../types'

export default function Loans() {
  const { list: props, byId } = useProperties()
  const loans = useLiveQuery(() => db.loans.toArray(), []) ?? []
  const vals = useLiveQuery(() => db.valuations.orderBy('id').toArray(), []) ?? []
  const [editLoan, setEditLoan] = useState<Loan | null>(null)
  const [editVal, setEditVal] = useState<Valuation | null>(null)

  // Räknesnurra
  const [calcLoan, setCalcLoan] = useState('')
  const [amount, setAmount] = useState('')
  const [rate, setRate] = useState('')
  const [delta, setDelta] = useState(1)
  const chosen = loans.find((l) => l.id === calcLoan)
  const A = chosen?.amount ?? parseAmount(amount) ?? 0
  const R = chosen?.rate ?? parseAmount(rate) ?? 0
  const privat = chosen ? byId[chosen.propertyId]?.ownership !== 'foretag' : true
  const perMonth = (r: number) => (A * r) / 100 / 12
  const afterDeduction = (x: number) => (privat ? x * 0.7 : x)

  return (
    <Page
      title="Lån och värde"
      sub="Lån, räntor och värderingar per fastighet, plus en räknesnurra för ränteändringar."
      actions={
        <button className="btn primary" onClick={() => setEditLoan({ id: '', propertyId: props[0]?.id ?? '', lender: '', amount: 0, rate: 0 })}>
          <Icon name="plus" /> Nytt lån
        </button>
      }
    >
      <div className="grid" style={{ ['--min' as string]: '360px' }}>
        <section className="card">
          <h2>Lån</h2>
          {loans.length === 0 ? (
            <div className="empty">Inga lån registrerade ännu. Klicka på Nytt lån.</div>
          ) : (
            <div className="table-wrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Fastighet</th>
                    <th>Bank</th>
                    <th className="num">Skuld</th>
                    <th className="num">Ränta</th>
                    <th>Bunden till</th>
                    <th className="num">Ränta/mån</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((l) => (
                    <tr key={l.id} className="click" onClick={() => setEditLoan(l)}>
                      <td>{byId[l.propertyId]?.name}</td>
                      <td>{l.lender}</td>
                      <td className="num">{fmtKr(l.amount)}</td>
                      <td className="num">{String(l.rate).replace('.', ',')} %</td>
                      <td>{l.boundUntil ?? 'Rörlig'}</td>
                      <td className="num">{fmtKr((l.amount * l.rate) / 1200)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <h2>Räknesnurra: om räntan ändras</h2>
          <Field label="Utgå från">
            <select className="input" value={calcLoan} onChange={(e) => setCalcLoan(e.target.value)}>
              <option value="">Eget belopp</option>
              {loans.map((l) => (
                <option key={l.id} value={l.id}>
                  {byId[l.propertyId]?.name}, {l.lender}
                </option>
              ))}
            </select>
          </Field>
          {!chosen && (
            <div className="grid" style={{ ['--min' as string]: '140px', gap: 12 }}>
              <Field label="Skuld (kr)">
                <input className="input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="t.ex. 2 000 000" />
              </Field>
              <Field label="Nuvarande ränta (%)">
                <input className="input" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="t.ex. 3,5" />
              </Field>
            </div>
          )}
          <div className="seg" role="group" aria-label="Ränteändring">
            {[-0.5, 0.5, 1, 2].map((x) => (
              <button key={x} className={delta === x ? 'on' : ''} onClick={() => setDelta(x)}>
                {x > 0 ? '+' : '−'}
                {String(Math.abs(x)).replace('.', ',')} %
              </button>
            ))}
          </div>
          <div className="notice" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
            <div className="row between">
              <span>Ränta idag</span>
              <strong>{fmtKr(perMonth(R))}/mån</strong>
            </div>
            <div className="row between">
              <span>Med {String(R + delta).replace('.', ',')} %</span>
              <strong>{fmtKr(perMonth(R + delta))}/mån</strong>
            </div>
            <div className="row between">
              <span>Skillnad {privat ? 'efter 30 % ränteavdrag' : '(kostnad i bolaget)'}</span>
              <strong>{fmtKr(afterDeduction(perMonth(R + delta) - perMonth(R)))}/mån</strong>
            </div>
          </div>
        </section>
      </div>

      <section className="card">
        <div className="row between">
          <h2>Värderingar och köpeskillingar</h2>
          <button className="btn sm" onClick={() => setEditVal({ id: '', propertyId: props[0]?.id ?? '', date: today(), value: 0, source: '' })}>
            <Icon name="plus" /> Ny värdering
          </button>
        </div>
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Fastighet</th>
                <th>Källa</th>
                <th className="num">Värde</th>
              </tr>
            </thead>
            <tbody>
              {[...vals]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((v) => (
                  <tr key={v.id} className="click" onClick={() => setEditVal(v)}>
                    <td>{v.date}</td>
                    <td>{byId[v.propertyId]?.name}</td>
                    <td>{v.source}</td>
                    <td className="num">{fmtKr(v.value)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {editLoan && <LoanModal l={editLoan} onClose={() => setEditLoan(null)} />}
      {editVal && <ValModal v={editVal} onClose={() => setEditVal(null)} />}
    </Page>
  )
}

function LoanModal({ l, onClose }: { l: Loan; onClose: () => void }) {
  const { list: props } = useProperties()
  const [d, setD] = useState({ ...l, a: l.amount ? String(l.amount) : '', r: l.rate ? String(l.rate).replace('.', ',') : '', am: l.amortization ? String(l.amortization) : '' })
  return (
    <Modal title={l.id ? 'Ändra lån' : 'Nytt lån'} onClose={onClose}>
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
        <Field label="Bank">
          <input className="input" value={d.lender} onChange={(e) => setD({ ...d, lender: e.target.value })} />
        </Field>
        <Field label="Skuld (kr)">
          <input className="input" inputMode="numeric" value={d.a} onChange={(e) => setD({ ...d, a: e.target.value })} />
        </Field>
        <Field label="Ränta (%)">
          <input className="input" inputMode="decimal" value={d.r} onChange={(e) => setD({ ...d, r: e.target.value })} />
        </Field>
        <Field label="Bunden till">
          <input className="input" type="date" value={d.boundUntil ?? ''} onChange={(e) => setD({ ...d, boundUntil: e.target.value })} />
        </Field>
        <Field label="Amortering (kr/mån)">
          <input className="input" inputMode="numeric" value={d.am} onChange={(e) => setD({ ...d, am: e.target.value })} />
        </Field>
      </div>
      <div className="row between">
        {l.id ? (
          <button className="btn danger" onClick={async () => (await db.loans.delete(l.id), onClose())}>
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
            disabled={parseAmount(d.a) == null || parseAmount(d.r) == null}
            onClick={async () => {
              await db.loans.put({ id: l.id || uid(), propertyId: d.propertyId, lender: d.lender, amount: parseAmount(d.a)!, rate: parseAmount(d.r)!, boundUntil: d.boundUntil || undefined, amortization: parseAmount(d.am) })
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

function ValModal({ v, onClose }: { v: Valuation; onClose: () => void }) {
  const { list: props } = useProperties()
  const [d, setD] = useState({ ...v, val: v.value ? String(v.value) : '' })
  return (
    <Modal title={v.id ? 'Ändra värdering' : 'Ny värdering'} onClose={onClose}>
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
        <Field label="Datum">
          <input className="input" type="date" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} />
        </Field>
        <Field label="Värde (kr)">
          <input className="input" inputMode="numeric" value={d.val} onChange={(e) => setD({ ...d, val: e.target.value })} />
        </Field>
      </div>
      <Field label="Källa, t.ex. mäklare eller taxering">
        <input className="input" value={d.source} onChange={(e) => setD({ ...d, source: e.target.value })} />
      </Field>
      <div className="row between">
        {v.id ? (
          <button className="btn danger" onClick={async () => (await db.valuations.delete(v.id), onClose())}>
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
            disabled={parseAmount(d.val) == null}
            onClick={async () => {
              await db.valuations.put({ id: v.id || uid(), propertyId: d.propertyId, date: d.date, value: parseAmount(d.val)!, source: d.source })
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
