// Dan namnger filer som "2025-03-13. Faktura-235. Hammarö Eltjänst (45 637 kr).pdf".
// Ur det namnet går det att läsa datum, leverantör, belopp och kategori.

export interface Parsed {
  name: string
  ext: string
  date?: string
  amount?: number
  supplier?: string
  category?: string
}

const CATEGORY_HINTS: [RegExp, string][] = [
  [/faktura|invoice/i, 'Faktura'],
  [/kvitto|köpt material/i, 'Kvitto'],
  [/offert|quotation/i, 'Offert'],
  [/försäkring/i, 'Försäkring'],
  [/lån|bank|ränte/i, 'Lån'],
  [/besiktning|radon|energidekl/i, 'Besiktning'],
  [/bygglov|ansökan om lov|grannemedgivande|kommun/i, 'Bygglov och myndighet'],
  [/ritning|planlösning|sketchup/i, 'Ritningar'],
  [/karta|tomtkarta|ledningar i mark/i, 'Kartor'],
  [/värdering|värdeutlåtande/i, 'Värdering'],
  [/köpekontrakt|avtal|lagfart|köpebrev|fastighetsutdrag/i, 'Juridik och avtal'],
  [/elförbrukning|ellevio|nordic.green|god.?el|va\b|vatten/i, 'Drift och förbrukning'],
  [/manual|anvisning|instruktion|produktblad/i, 'Instruktioner och manualer'],
]

export function parseFilename(filename: string): Parsed {
  const dot = filename.lastIndexOf('.')
  const ext = dot > 0 ? filename.slice(dot + 1).toUpperCase() : ''
  const name = dot > 0 ? filename.slice(0, dot) : filename
  const out: Parsed = { name, ext }

  const d = name.match(/^((?:19|20)\d{2})-?(\d{2})-?(\d{2})/) ?? name.match(/((?:19|20)\d{2})-(\d{2})-(\d{2})/)
  if (d && +d[2] >= 1 && +d[2] <= 12 && +d[3] >= 1 && +d[3] <= 31) out.date = `${d[1]}-${d[2]}-${d[3]}`
  else {
    const ym = name.match(/^((?:19|20)\d{2})-(\d{2})\b/)
    if (ym && +ym[2] >= 1 && +ym[2] <= 12) out.date = `${ym[1]}-${ym[2]}-01`
  }

  const a = name.match(/\(([\d\s .,]+)\s*(kr|tkr|mkr)\)/i)
  if (a) {
    const v = Number(a[1].replace(/[\s ]/g, '').replace(',', '.'))
    if (Number.isFinite(v)) out.amount = Math.round(v * { kr: 1, tkr: 1e3, mkr: 1e6 }[a[2].toLowerCase() as 'kr']! * 100) / 100
  }

  // Leverantören är ofta första delen efter datumet: "2025-02-13. Faktura Thermotech" / "2024-07-30. Ellevio. ..."
  if (/^(?:19|20)\d{2}/.test(name)) {
    const rest = name
      .replace(/^[\d-]+\.?\s*/, '')
      .replace(/\(.*?\)/g, '')
      .split('.')
      .map((s) => s.trim())
      .filter(Boolean)
    const first = rest.find((s) => !/^(faktura|offert|kvitto)[-\s\d]*$/i.test(s))
    if (first) out.supplier = first.replace(/^(faktura|offert)\s+/i, '').slice(0, 60)
  }

  for (const [re, cat] of CATEGORY_HINTS) {
    if (re.test(name)) {
      out.category = cat
      break
    }
  }
  if (!out.category && /^(JPG|JPEG|PNG|HEIC|WEBP)$/.test(ext)) out.category = 'Foton'
  return out
}
