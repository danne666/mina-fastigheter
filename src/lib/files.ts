import JSZip from 'jszip'
import { db, TABLES } from '../db'
import type { Doc } from '../types'

export async function fileFor(doc: Doc) {
  const key = doc.versions.at(-1)?.fileKey
  return key ? db.files.get(key) : undefined
}

const safe = (s: string) => s.replace(/[\\/:*?"<>|]/g, '_')

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export async function openDoc(doc: Doc) {
  const f = await fileFor(doc)
  if (f) window.open(URL.createObjectURL(f.blob), '_blank', 'noopener')
  else if (doc.dropboxUrl) window.open(doc.dropboxUrl, '_blank', 'noopener')
}

export async function downloadDoc(doc: Doc) {
  const f = await fileFor(doc)
  if (f) saveBlob(f.blob, f.name)
  else if (doc.dropboxUrl) window.open(doc.dropboxUrl, '_blank', 'noopener')
}

/** Skriver ut PDF och bilder direkt. Länkade Dropbox-filer öppnas för utskrift där. */
export async function printDoc(doc: Doc) {
  const f = await fileFor(doc)
  if (!f) return openDoc(doc)
  const url = URL.createObjectURL(f.blob)
  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  if (f.type.startsWith('image/')) {
    frame.srcdoc = `<img src="${url}" style="max-width:100%" onload="window.print()">`
  } else {
    frame.src = url
    frame.onload = () => frame.contentWindow?.print()
  }
  document.body.appendChild(frame)
  setTimeout(() => {
    frame.remove()
    URL.revokeObjectURL(url)
  }, 60000)
}

/** ZIP med valda dokument. Dokument som bara finns i Dropbox listas i en länkfil. */
export async function zipDocs(docs: Doc[], zipName: string) {
  const zip = new JSZip()
  const links: string[] = []
  for (const d of docs) {
    const f = await fileFor(d)
    if (f) zip.file(safe(f.name), f.blob)
    else if (d.dropboxUrl) links.push(`${d.name}.${d.ext.toLowerCase()}\n${d.dropboxUrl}\n`)
  }
  if (links.length) zip.file('Länkar till filer i Dropbox.txt', links.join('\n'))
  saveBlob(await zip.generateAsync({ type: 'blob' }), zipName)
}

/** Hela appens innehåll som en ZIP: data.json plus alla uppladdade filer. */
export async function exportBackup() {
  const zip = new JSZip()
  const data: Record<string, unknown[]> = {}
  for (const t of TABLES) data[t] = await db.table(t).toArray()
  zip.file('data.json', JSON.stringify({ app: 'mina-fastigheter', version: __APP_VERSION__, exported: new Date().toISOString(), data }, null, 1))
  const files = await db.files.toArray()
  zip.file('files.json', JSON.stringify(files.map(({ key, name, type }) => ({ key, name, type }))))
  for (const f of files) zip.file(`files/${f.key}`, f.blob)
  saveBlob(await zip.generateAsync({ type: 'blob' }), `mina-fastigheter-backup-${new Date().toISOString().slice(0, 10)}.zip`)
}

export async function importBackup(file: File) {
  const zip = await JSZip.loadAsync(file)
  const parsed = JSON.parse(await zip.file('data.json')!.async('string'))
  if (parsed.app !== 'mina-fastigheter') throw new Error('Filen är inte en säkerhetskopia från Mina fastigheter')
  const meta: { key: string; name: string; type: string }[] = JSON.parse((await zip.file('files.json')?.async('string')) ?? '[]')
  await db.transaction('rw', [...TABLES.map((t) => db.table(t)), db.files], async () => {
    for (const t of TABLES) {
      await db.table(t).clear()
      await db.table(t).bulkAdd(parsed.data[t] ?? [])
    }
    await db.files.clear()
    for (const m of meta) {
      const blob = await zip.file(`files/${m.key}`)?.async('blob')
      if (blob) await db.files.add({ ...m, blob: new Blob([blob], { type: m.type }) })
    }
  })
}
