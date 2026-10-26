// Lokal inloggning: lösenordet sparas aldrig, bara en PBKDF2-hash i webbläsaren.
// Det skyddar appen mot att någon annan öppnar den på samma dator. När appen får en
// server (Supabase) byts detta mot riktig inloggning med konto och tvåstegsverifiering.

const KEY = 'mf.auth'
const SESSION = 'mf.session'

interface Stored {
  email: string
  salt: string
  hash: string
}

const enc = new TextEncoder()
const toHex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')

async function derive(password: string, saltHex: string) {
  const salt = new Uint8Array(saltHex.match(/../g)!.map((h) => parseInt(h, 16)))
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' }, key, 256)
  return toHex(bits)
}

function read(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Stored) : null
  } catch {
    return null
  }
}

export const hasAccount = () => read() !== null
export const accountEmail = () => read()?.email ?? ''

export async function createAccount(email: string, password: string) {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer)
  const hash = await derive(password, salt)
  localStorage.setItem(KEY, JSON.stringify({ email, salt, hash }))
  sessionStorage.setItem(SESSION, '1')
}

export async function login(email: string, password: string) {
  const s = read()
  if (!s || s.email.toLowerCase() !== email.trim().toLowerCase()) return false
  const ok = (await derive(password, s.salt)) === s.hash
  if (ok) sessionStorage.setItem(SESSION, '1')
  return ok
}

export const isLoggedIn = () => {
  try {
    return sessionStorage.getItem(SESSION) === '1'
  } catch {
    return false
  }
}

export const logout = () => sessionStorage.removeItem(SESSION)

export const resetAccount = () => {
  localStorage.removeItem(KEY)
  sessionStorage.removeItem(SESSION)
}
