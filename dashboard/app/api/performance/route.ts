import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { storageGet, storagePut } from '@/lib/storage'

const PERF_PATH = 'intelligence/performance-log.md'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  try {
    const content = await storageGet(userId, PERF_PATH) ?? ''
    return NextResponse.json({ content })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  try {
    const { entry } = await request.json() as { entry: string }
    if (!entry?.trim()) return NextResponse.json({ error: 'entry requis' }, { status: 400 })
    const existing = await storageGet(userId, PERF_PATH) ?? ''
    await storagePut(userId, PERF_PATH, existing + '\n' + entry.trim() + '\n')
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
