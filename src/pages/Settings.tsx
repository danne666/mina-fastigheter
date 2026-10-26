import { useState } from 'react'
import { Page } from '../components/Layout'
import { Field, Icon } from '../components/ui'
import { db } from '../db'
import { accountEmail, resetAccount } from '../lib/auth'
import { exportBackup, importBackup } from '../lib/files'
import changelog from '../../CHANGELOG.md?raw'

export default function Settings() {
  const [msg, setMsg] = useState('')
  const [name, setName] = useState('')
  const [postal, setPostal] = useState('')

  return (
    <Page title="Inställningar och säkerhetskopia" sub={`Inloggad som ${accountEmail()} · version ${__APP_VERSION__}`}>
      <div className="grid" style={{ ['--min' as string]: '340px' }}>
        <section className="card">
          <h2>Säkerhetskopia</h2>
          <p className="muted">
            Data sparas i den här webbläsaren. Ta en säkerhetskopia regelbundet och lägg den i Dropbox. Den innehåller alla uppgifter och uppladdade filer.
          </p>
          <div className="row">
            <button className="btn primary" onClick={() => exportBackup()}>
              <Icon name="download" /> Ladda ned säkerhetskopia
            </button>
            <label className="btn">
              <Icon name="upload" /> Läs in säkerhetskopia
              <input
                type="file"
                accept=".zip"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (!f) return
                  if ((await db.properties.count()) > 0 && !confirm('Allt i appen ersätts med innehållet i säkerhetskopian. Fortsätta?')) return
                  try {
                    await importBackup(f)
                    setMsg('Säkerhetskopian är inläst.')
                  } catch (err) {
                    setMsg(`Kunde inte läsa filen: ${(err as Error).message}`)
                  }
                }}
              />
            </label>
          </div>
          {msg && (
            <p role="status" className="notice">
              {msg}
            </p>
          )}
        </section>

        <section className="card">
          <h2>Lägg till fastighet eller plats</h2>
          <p className="muted">Till exempel Vintergatan eller Lamberget om de ska följas här.</p>
          <Field label="Namn">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Postnummer och ort">
            <input className="input" value={postal} onChange={(e) => setPostal(e.target.value)} />
          </Field>
          <button
            className="btn"
            disabled={!name.trim()}
            onClick={async () => {
              const id = name.toLowerCase().replace(/[^a-z0-9åäö]+/g, '-')
              await db.properties.add({
                id,
                sort: (await db.properties.count()) + 1,
                name,
                short: name
                  .split(/\s+/)
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 3),
                postal,
                municipality: '',
                type: '[typ]',
                ownership: 'foretag',
                ownerText: '[ägare]',
                color: '#0F766E',
                tint: '#DDF3F0',
                facts: [],
              })
              setName('')
              setPostal('')
              setMsg(`${name} är tillagd i menyn.`)
            }}
          >
            <Icon name="plus" /> Lägg till
          </button>
        </section>

        <section className="card">
          <h2>Inloggning</h2>
          <p className="muted">Inloggningen gäller den här webbläsaren. Glömmer du lösenordet kan du nollställa det, data ligger kvar.</p>
          <button
            className="btn danger"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => {
              if (confirm('Nollställ inloggningen? Du får välja nytt lösenord direkt.')) {
                resetAccount()
                location.reload()
              }
            }}
          >
            Byt lösenord
          </button>
        </section>
      </div>

      <section className="card">
        <h2>Versioner</h2>
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0, fontSize: 14 }}>{changelog}</pre>
      </section>
    </Page>
  )
}
