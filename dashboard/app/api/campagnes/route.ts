import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { listCampaigns, writeCampaign } from '@/lib/parse-campaigns'
import { slugify } from '@/lib/parse-ideas'
import type { Format, CampaignStatus } from '@/lib/types'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  try {
    return NextResponse.json(await listCampaigns(userId))
  } catch { return NextResponse.json([]) }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  try {
    const body = await request.json() as { titre: string; format: Format | 'Mix'; duree: number }
    if (!body.titre?.trim()) return NextResponse.json({ error: 'titre requis' }, { status: 400 })

    const slug = slugify(body.titre) + '-' + Date.now().toString(36)
    const campaign = {
      slug,
      titre: body.titre.trim(),
      format: body.format ?? 'Post' as Format,
      duree: body.duree ?? 3,
      objectif: '',
      statut: 'draft' as CampaignStatus,
      createdAt: new Date().toISOString().split('T')[0],
      brief: '',
      phases: '',
      episodesSlug: [],
      contexte: '',
    }
    await writeCampaign(userId, campaign)
    return NextResponse.json(campaign, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
