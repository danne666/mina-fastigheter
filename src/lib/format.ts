const kr = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 })

export const fmtKr = (n?: number) => (n == null || Number.isNaN(n) ? '–' : `${kr.format(n)} kr`)
export const fmtNum = (n?: number) => (n == null ? '–' : kr.format(n))
export const fmtSize = (b: number) =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} kB` : `${(b / 1048576).toFixed(1)} MB`

export const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

export const today = () => new Date().toISOString().slice(0, 10)

/** Läser "1 234,50" eller "1234.5" till ett tal. */
export const parseAmount = (s: string) => {
  if (!s.trim()) return undefined
  const v = Number(s.replace(/[\s ]/g, '').replace(',', '.'))
  return Number.isFinite(v) ? v : undefined
}
