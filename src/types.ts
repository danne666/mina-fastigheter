export type Ownership = 'privat' | 'delat' | 'foretag'

export interface Fact {
  label: string
  value: string
  source?: string
}

export interface Property {
  id: string
  sort: number
  name: string
  short: string
  postal: string
  municipality: string
  type: string
  ownership: Ownership
  ownerText: string
  color: string
  tint: string
  facts: Fact[]
  notes?: string
  dropboxFolder?: string
  photoCount?: number
}

export interface DocVersion {
  v: number
  date: string
  note: string
  size: number
  fileKey?: string
}

export interface Doc {
  id: string
  propertyId: string
  name: string
  ext: string
  category: string
  date?: string
  amount?: number
  supplier?: string
  tags: string[]
  folder?: string
  dropboxUrl?: string
  versions: DocVersion[]
  createdAt: string
}

export interface StoredFile {
  key: string
  blob: Blob
  name: string
  type: string
}

export const COST_CATEGORIES = [
  'El',
  'Vatten och avlopp',
  'Värme',
  'Internet och tv',
  'Försäkring',
  'Renhållning',
  'Fastighetsavgift',
  'Ränta',
  'Samfällighet',
  'Övrigt',
] as const
export type CostCategory = (typeof COST_CATEGORIES)[number]

export interface Cost {
  id: string
  propertyId: string
  date: string
  category: CostCategory
  amount: number
  supplier?: string
  note?: string
  kwh?: number
  docId?: string
}

export interface Loan {
  id: string
  propertyId: string
  lender: string
  amount: number
  rate: number
  boundUntil?: string
  amortization?: number
}

export type MaintStatus = 'ok' | 'bevaka' | 'planerad' | 'pågår' | 'klar'

export interface Maintenance {
  id: string
  propertyId: string
  part: string
  lastDone?: string
  nextYear?: string
  estCost?: number
  status: MaintStatus
  note?: string
}

export interface Phase {
  name: string
  state: 'klar' | 'pågår' | 'kvar'
}

export interface Project {
  id: string
  propertyId: string
  name: string
  split?: { name: string; share: number }[]
  phases: Phase[]
  note?: string
}

export interface ProjectItem {
  id: string
  projectId: string
  post: string
  budget?: number
  actual?: number
  supplier?: string
  note?: string
}

export interface Material {
  id: string
  name: string
  qty: string
  location: string
  unitPrice?: string
  note?: string
}

export interface Valuation {
  id: string
  propertyId: string
  date: string
  value: number
  source: string
}

export const DOC_CATEGORIES = [
  'Faktura',
  'Kvitto',
  'Offert',
  'Juridik och avtal',
  'Försäkring',
  'Lån',
  'Besiktning',
  'Bygglov och myndighet',
  'Ritningar',
  'Kartor',
  'Värdering',
  'Drift och förbrukning',
  'Installationer',
  'Instruktioner och manualer',
  'Material och produkter',
  'Sammanställning bank/mäklare',
  'Sammanfattning',
  'Foton',
  'Övrigt',
]
