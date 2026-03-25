import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { setUserLimit } from '@/lib/usage'

function isAdmin(userId: string) {
  return userId === (process.env.ADMIN_USER_ID ?? 'jonathan')
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(session.user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const { monthlyTokenLimit } = await request.json() as { monthlyTokenLimit: number }
    if (!Number.isFinite(monthlyTokenLimit) || monthlyTokenLimit < 1000) {
      return NextResponse.json({ error: 'monthlyTokenLimit invalide (min 1000)' }, { status: 400 })
    }
    await setUserLimit(session.user.id, monthlyTokenLimit)
    return NextResponse.json({ ok: true, monthlyTokenLimit })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
