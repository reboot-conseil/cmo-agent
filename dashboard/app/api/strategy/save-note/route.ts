import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { saveNote } from '@/lib/vision'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  try {
    const body = await req.json() as { note: string }
    if (typeof body.note !== 'string') {
      return NextResponse.json({ error: 'note must be a string' }, { status: 400 })
    }
    await saveNote(userId, body.note)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
