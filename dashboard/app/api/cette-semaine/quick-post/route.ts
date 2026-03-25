import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { checkUsage, recordUsage } from '@/lib/usage'
import { generateQuickPost } from '@/lib/generate-quick-post'
import { writeIdea, slugify } from '@/lib/parse-ideas'
import type { Idea } from '@/lib/types'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  try {
    const body = await request.json() as { sujet?: string }

    if (!body.sujet || body.sujet.trim() === '') {
      return NextResponse.json({ error: 'sujet is required' }, { status: 400 })
    }

    const sujet = body.sujet.trim()
    await checkUsage(userId)
    const { _tokens, pilier, format, hook, texte, visuelType, visuelDescription, hashtags } = await generateQuickPost(sujet)
    recordUsage(userId, _tokens.inputTokens, _tokens.outputTokens).catch(() => {})

    const ts = Date.now().toString(36)
    const slug = `${slugify(sujet)}-${ts}`
    const today = new Date().toISOString().split('T')[0]

    const idea: Idea = {
      slug,
      sujet,
      pilier,
      format,
      hook,
      texte,
      statut: 'draft',
      semaine: null,
      jour: null,
      createdAt: today,
      visuelType,
      visuelDescription,
      hashtags,
    }

    await writeIdea(userId, idea)
    return NextResponse.json({ idea })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
