import { put, del, list } from '@vercel/blob'
import fs from 'fs'
import path from 'path'

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN
const CMO_BASE = process.env.CMO_BASE ?? '/Users/jonathanbraun/cmo-agent'

// --- Local filesystem fallback (dev sans BLOB_READ_WRITE_TOKEN) ---

function localPath(relativePath: string): string {
  // userId ignoré en local — un seul user, données dans CMO_BASE
  const parts = relativePath.split('/')
  // relativePath = "content/ideas/..." (on enlève le userId prefix si présent)
  return path.join(CMO_BASE, parts.join('/'))
}

function localGet(relativePath: string): string | null {
  const p = localPath(relativePath)
  if (fs.existsSync(p)) return fs.readFileSync(p, 'utf-8')
  // identity.md n'existe pas localement → lire CLAUDE.md à la racine
  if (relativePath === 'identity.md' || relativePath === 'config/identity.md') {
    const claudePath = path.join(CMO_BASE, 'CLAUDE.md')
    if (fs.existsSync(claudePath)) return fs.readFileSync(claudePath, 'utf-8')
  }
  return null
}

function localPut(relativePath: string, content: string): void {
  const p = localPath(relativePath)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, content, 'utf-8')
}

function localDelete(relativePath: string): void {
  const p = localPath(relativePath)
  if (fs.existsSync(p)) fs.unlinkSync(p)
}

function localList(prefix: string): string[] {
  const dir = localPath(prefix)
  if (!fs.existsSync(dir)) return []
  return walkDir(dir).map(f => path.relative(CMO_BASE, f))
}

function walkDir(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walkDir(full))
    else files.push(full)
  }
  return files
}

// --- Blob helpers ---

function blobPath(userId: string, relativePath: string): string {
  return `${userId}/${relativePath}`
}

// --- Public API ---

export async function storageGet(userId: string, relativePath: string): Promise<string | null> {
  if (!USE_BLOB) return localGet(relativePath)
  const prefix = blobPath(userId, relativePath)
  try {
    const { blobs } = await list({ prefix, limit: 1 })
    const blob = blobs.find(b => b.pathname === prefix)
    if (!blob) return null
    const res = await fetch(blob.url)
    if (!res.ok) return null
    return res.text()
  } catch {
    return null
  }
}

export async function storagePut(userId: string, relativePath: string, content: string): Promise<void> {
  if (!USE_BLOB) { localPut(relativePath, content); return }
  await put(blobPath(userId, relativePath), content, {
    access: 'public',
    contentType: 'text/markdown; charset=utf-8',
    addRandomSuffix: false,
    allowOverwrite: true,
  })
}

export async function storageDelete(userId: string, relativePath: string): Promise<void> {
  if (!USE_BLOB) { localDelete(relativePath); return }
  try {
    const { blobs } = await list({ prefix: blobPath(userId, relativePath) })
    for (const blob of blobs) await del(blob.url)
  } catch { /* already gone */ }
}

export async function storageList(userId: string, prefix: string): Promise<string[]> {
  if (!USE_BLOB) return localList(prefix)
  const fullPrefix = blobPath(userId, prefix)
  const { blobs } = await list({ prefix: fullPrefix })
  return blobs.map(b => b.pathname.replace(`${userId}/`, ''))
}
