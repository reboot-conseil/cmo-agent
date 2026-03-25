import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { checkUsage, recordUsage } from '@/lib/usage'
import { generateStrategyPlan } from '@/lib/generate-strategy'
import type { GeneratePlanRequest } from '@/lib/types'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  try {
    const body = await request.json() as GeneratePlanRequest
    if (!body.semaines || body.semaines < 1) {
      return NextResponse.json({ error: 'semaines requis (min 1)' }, { status: 400 })
    }
    await checkUsage(userId)
    const { _tokens, ...result } = await generateStrategyPlan(userId, body)
    recordUsage(userId, _tokens.inputTokens, _tokens.outputTokens).catch(() => {})
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
