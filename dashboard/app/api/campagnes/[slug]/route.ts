import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { readCampaign, writeCampaign } from '@/lib/parse-campaigns'
import type { Campaign } from '@/lib/types'

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  try {
    const { slug } = await params
    const existing = await readCampaign(userId, slug)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updates = await request.json() as Partial<Campaign>
    // Protect immutable fields
    const { slug: _s, createdAt: _c, ...safeUpdates } = updates
    const updated: Campaign = { ...existing, ...safeUpdates }
    await writeCampaign(userId, updated)
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
