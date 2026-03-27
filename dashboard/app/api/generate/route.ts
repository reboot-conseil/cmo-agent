import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { checkUsage, recordUsage } from '@/lib/usage'
import { generateIdeaContent } from '@/lib/generate'
import { readIdea, writeIdea } from '@/lib/parse-ideas'
import type { GenerateRequest } from '@/lib/types'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  try {
    const body = await request.json() as GenerateRequest

    if (!body.slug || !body.sujet) {
      return NextResponse.json({ error: 'slug et sujet requis' }, { status: 400 })
    }

    await checkUsage(userId)
    const { _tokens, ...generated } = await generateIdeaContent(body)
    recordUsage(userId, _tokens.inputTokens, _tokens.outputTokens).catch(() => {})

    // Merge generated content into the existing idea file
    const existing = await readIdea(userId, body.slug)
    if (existing) {
      await writeIdea(userId, {
        ...existing,
        hook: generated.hook,
        texte: generated.texte,
        visuelType: generated.visuelType,
        visuelDescription: generated.visuelDescription,
        hashtags: generated.hashtags,
        statut: existing.statut === 'raw' ? 'draft' : existing.statut,
      })
    }

    return NextResponse.json(generated)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
