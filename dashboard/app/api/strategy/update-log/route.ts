import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { appendGenerationEntry } from '@/lib/generation-log'
import type { GenerationEntry } from '@/lib/types'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
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
