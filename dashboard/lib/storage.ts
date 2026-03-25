import { put, del, list } from '@vercel/blob'

function blobPath(userId: string, relativePath: string): string {
  return `${userId}/${relativePath}`
}

export async function storageGet(userId: string, relativePath: string): Promise<string | null> {
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
  await put(blobPath(userId, relativePath), content, {
    access: 'public',
    contentType: 'text/markdown; charset=utf-8',
    addRandomSuffix: false,
    allowOverwrite: true,
  })
}

export async function storageDelete(userId: string, relativePath: string): Promise<void> {
  try {
    const { blobs } = await list({ prefix: blobPath(userId, relativePath) })
    for (const blob of blobs) {
      await del(blob.url)
    }
  } catch { /* already gone */ }
}

export async function storageList(userId: string, prefix: string): Promise<string[]> {
  const fullPrefix = blobPath(userId, prefix)
  const { blobs } = await list({ prefix: fullPrefix })
  return blobs.map(b => b.pathname.replace(`${userId}/`, ''))
}
