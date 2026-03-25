import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getUsageSummary } from '@/lib/usage'

function isAdmin(userId: string) {
  return userId === (process.env.ADMIN_USER_ID ?? 'jonathan')
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(session.user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const summary = await getUsageSummary(session.user.id)
    return NextResponse.json(summary)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
