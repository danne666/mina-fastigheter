import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Property } from '../types'

export function useProperties() {
  const list = useLiveQuery(() => db.properties.toArray().then((l) => l.sort((a, b) => (a.sort ?? 99) - (b.sort ?? 99))), []) ?? []
  const byId: Record<string, Property> = Object.fromEntries(list.map((p) => [p.id, p]))
  return { list, byId }
}

export const OWNER_FILTERS = [
  ['alla', 'Alla'],
  ['privat', 'Privat'],
  ['foretag', 'Företag'],
] as const
export type OwnerFilter = (typeof OWNER_FILTERS)[number][0]

/** Privat-filtret visar även fastigheten som ägs till hälften privat. */
export const matchOwner = (p: Property | undefined, f: OwnerFilter) =>
  !!p && (f === 'alla' || (f === 'privat' ? p.ownership !== 'foretag' : p.ownership === 'foretag'))
