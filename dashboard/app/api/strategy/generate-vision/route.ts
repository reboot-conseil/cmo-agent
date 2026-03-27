import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { checkUsage, recordUsage } from '@/lib/usage'
import { generateVision } from '@/lib/generate-vision'
import { saveVision, readVision } from '@/lib/vision'

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  try {
    const today = new Date().toISOString().slice(0, 10)
    await checkUsage(userId)
    const { _tokens, ...vision } = await generateVision(userId)
    recordUsage(userId, _tokens.inputTokens, _tokens.outputTokens).catch(() => {})
    await saveVision(userId, vision, today)
    const visionData = await readVision(userId)
    return NextResponse.json(visionData)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
