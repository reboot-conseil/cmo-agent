import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { listIdeas, writeIdea, slugify } from '@/lib/parse-ideas'
import type { Format, IdeaStatus } from '@/lib/types'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  try {
    return NextResponse.json(await listIdeas(userId))
  } catch { return NextResponse.json([]) }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  try {
    const body = await request.json() as { sujet: string; pilier: string; format: Format }
    if (!body.sujet?.trim()) return NextResponse.json({ error: 'sujet requis' }, { status: 400 })

    const slug = slugify(body.sujet) + '-' + Date.now().toString(36)
    const idea = {
      slug,
      sujet: body.sujet.trim(),
      pilier: body.pilier ?? 'IA & Transformation',
      format: body.format ?? 'Post' as Format,
      statut: 'raw' as IdeaStatus,
      semaine: null,
      jour: null,
      createdAt: new Date().toISOString().split('T')[0],
      hook: '',
      texte: '',
      visuelType: '',
      visuelDescription: '',
      hashtags: [],
    }
    await writeIdea(userId, idea)
    return NextResponse.json(idea, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
