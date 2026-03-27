import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUsageSummary } from '@/lib/usage'

function isAdmin(userId: string) {
  return userId === (process.env.ADMIN_USER_ID ?? 'jonathan')
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const summary = await getUsageSummary(userId)
    return NextResponse.json(summary)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
