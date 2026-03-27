import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { checkUsage, recordUsage } from '@/lib/usage'
import { generateVeille } from '@/lib/generate-veille'

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  try {
    await checkUsage(userId)
    const { items, _tokens } = await generateVeille()
    recordUsage(userId, _tokens.inputTokens, _tokens.outputTokens).catch(() => {})
    return NextResponse.json({ items })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
