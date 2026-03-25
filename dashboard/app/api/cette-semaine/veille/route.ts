import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { checkUsage, recordUsage } from '@/lib/usage'
import { generateVeille } from '@/lib/generate-veille'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  try {
    await checkUsage(userId)
    const { items, _tokens } = await generateVeille()
    recordUsage(userId, _tokens.inputTokens, _tokens.outputTokens).catch(() => {})
    return NextResponse.json({ items })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
