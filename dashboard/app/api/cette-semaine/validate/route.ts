import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { readIdea, writeIdea, slugify } from '@/lib/parse-ideas'
import type { Idea, Format, Jour } from '@/lib/types'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  try {
    const body = await request.json() as {
      sujet: string
      pilier?: string
      format?: Format
      hook?: string
      campagneSlug?: string
      ideaSlug?: string
      jour?: Jour
      semaine?: number
      sourceLabel?: string
    }

    if (body.ideaSlug) {
      // Update existing idea with scheduling
      const existing = await readIdea(userId, body.ideaSlug)
      if (!existing) return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
      const updated: Idea = {
        ...existing,
        jour: body.jour ?? null,
        semaine: body.semaine ?? null,
        statut: 'scheduled',
      }
      await writeIdea(userId, updated)
      return NextResponse.json(updated)
    }

    // Create new draft idea from reactive/terrain/evergreen post
    // texte is intentionally empty — content generated later via /api/generate
    const ts = Date.now().toString(36)
    const slug = `${slugify(body.sujet)}-${ts}`
    const today = new Date().toISOString().split('T')[0]
    const idea: Idea = {
      slug,
      sujet: body.sujet,
      pilier: body.pilier ?? 'IA & Transformation',
      format: body.format ?? 'Post',
      statut: 'scheduled',
      semaine: body.semaine ?? null,
      jour: body.jour ?? null,
      createdAt: today,
      hook: body.hook ?? '',
      texte: '',
      visuelType: 'Photo authentique',
      visuelDescription: '',
      hashtags: [],
      campagne: body.campagneSlug,
    }
    await writeIdea(userId, idea)
    return NextResponse.json(idea)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
