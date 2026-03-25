import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { appendGenerationEntry } from '@/lib/generation-log'
import type { GenerationEntry } from '@/lib/types'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  try {
    const body = await request.json() as GenerationEntry
    if (!body.date || !body.campaigns?.length) {
      return NextResponse.json({ error: 'date et campaigns requis' }, { status: 400 })
    }
    await appendGenerationEntry(userId, body)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
