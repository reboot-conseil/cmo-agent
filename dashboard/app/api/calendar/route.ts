import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { listIdeas } from '@/lib/parse-ideas'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  try {
    const ideas = (await listIdeas(userId)).filter(i => i.semaine !== null)
    return NextResponse.json(ideas)
  } catch { return NextResponse.json([]) }
}
