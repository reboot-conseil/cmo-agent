import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { listIdeas } from '@/lib/parse-ideas'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  try {
    const ideas = (await listIdeas(userId)).filter(i => i.semaine !== null)
    return NextResponse.json(ideas)
  } catch { return NextResponse.json([]) }
}
