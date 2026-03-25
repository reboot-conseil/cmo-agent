import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getUsageSummary } from '@/lib/usage'

function isAdmin(userId: string) {
  return userId === (process.env.ADMIN_USER_ID ?? 'jonathan')
}

/** Returns usage for the last 6 months */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(session.user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const now = new Date()
    const months: string[] = []
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(d.toISOString().slice(0, 7))
    }
    const history = await Promise.all(
      months.map(m => getUsageSummary(session.user!.id!, m))
    )
    return NextResponse.json(history)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
