import { useState } from 'react'
import { Icon } from '../components/ui'
import { accountEmail, createAccount, hasAccount, login, resetAccount } from '../lib/auth'

export default function Login({ onDone }: { onDone: () => void }) {
  const first = !hasAccount()
  const [email, setEmail] = useState(accountEmail())
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    if (first) {
      if (pw.length < 8) return setErr('Lösenordet behöver minst 8 tecken.')
      if (pw !== pw2) return setErr('Lösenorden är inte lika.')
      setBusy(true)
      await createAccount(email.trim(), pw)
      return onDone()
    }
    setBusy(true)
    const ok = await login(email, pw)
    setBusy(false)
    if (ok) onDone()
    else setErr('Fel e-post eller lösenord.')
  }

  return (
    <div className="login-wrap">
      <form className="login" onSubmit={submit}>
        <div className="row" style={{ color: 'var(--accent)' }}>
          <Icon name="home" size={30} />
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>Mina fastigheter</span>
        </div>
        <div className="stack">
          <h1 style={{ fontSize: 24 }}>{first ? 'Skapa inloggning' : 'Logga in'}</h1>
          <p className="muted">{first ? 'Första gången på den här enheten. Välj e-post och lösenord.' : 'Dokument och siffror för alla fyra fastigheter.'}</p>
        </div>
        <div className="field">
          <label htmlFor="epost">E-post</label>
          <input id="epost" className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="losen">Lösenord</label>
          <input id="losen" className="input" type="password" autoComplete={first ? 'new-password' : 'current-password'} required value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        {first && (
          <div className="field">
            <label htmlFor="losen2">Upprepa lösenord</label>
            <input id="losen2" className="input" type="password" autoComplete="new-password" required value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
        )}
        {err && (
          <p role="alert" style={{ color: 'var(--danger)', fontSize: 14 }}>
            {err}
          </p>
        )}
        <button className="btn primary" style={{ minHeight: 48, fontSize: 16 }} disabled={busy}>
          {first ? 'Skapa och logga in' : 'Logga in'}
        </button>
        <p className="muted small">
          Version {__APP_VERSION__}. Inloggningen gäller den här webbläsaren. Data sparas lokalt tills appen kopplas till en server.
        </p>
        {!first && (
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => {
              if (confirm('Glömt lösenordet? Inloggningen nollställs men dina data ligger kvar.')) {
                resetAccount()
                location.reload()
              }
            }}
          >
            Glömt lösenordet
          </button>
        )}
      </form>
    </div>
  )
}
