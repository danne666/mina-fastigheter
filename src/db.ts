import Dexie, { type EntityTable } from 'dexie'
import type { Cost, Doc, Loan, Maintenance, Material, Project, ProjectItem, Property, StoredFile, Valuation } from './types'

export const db = new Dexie('mina-fastigheter') as Dexie & {
  properties: EntityTable<Property, 'id'>
  docs: EntityTable<Doc, 'id'>
  files: EntityTable<StoredFile, 'key'>
  costs: EntityTable<Cost, 'id'>
  loans: EntityTable<Loan, 'id'>
  maintenance: EntityTable<Maintenance, 'id'>
  projects: EntityTable<Project, 'id'>
  projectItems: EntityTable<ProjectItem, 'id'>
  materials: EntityTable<Material, 'id'>
  valuations: EntityTable<Valuation, 'id'>
}

db.version(1).stores({
  properties: 'id',
  docs: 'id, propertyId, category, date',
  files: 'key',
  costs: 'id, propertyId, date, category',
  loans: 'id, propertyId',
  maintenance: 'id, propertyId',
  projects: 'id, propertyId',
  projectItems: 'id, projectId',
  materials: 'id, location',
  valuations: 'id, propertyId',
})

export const uid = () => crypto.randomUUID()

export const TABLES = [
  'properties',
  'docs',
  'costs',
  'loans',
  'maintenance',
  'projects',
  'projectItems',
  'materials',
  'valuations',
] as const
