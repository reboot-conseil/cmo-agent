import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { checkUsage, recordUsage } from '@/lib/usage'
import { readCampaign, writeCampaign } from '@/lib/parse-campaigns'
import { readIdea, writeIdea, slugify } from '@/lib/parse-ideas'
import { generateCampaign } from '@/lib/generate-campaign'
import type { CampaignGenerateRequest, Idea, IdeaStatus, Format } from '@/lib/types'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  try {
    const body = await request.json() as CampaignGenerateRequest

    if (!body.slug || !body.titre) {
      return NextResponse.json({ error: 'slug et titre requis' }, { status: 400 })
    }

    const existing = await readCampaign(userId, body.slug)
    if (!existing) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    // Generate via Claude
    await checkUsage(userId)
    const { _tokens, ...generated } = await generateCampaign(body)
    recordUsage(userId, _tokens.inputTokens, _tokens.outputTokens).catch(() => {})

    // Identify which existing episode slots can be overwritten (non-published)
    const overwritableSlots: string[] = []
    const preservedSlots: string[] = []
    for (const epSlug of existing.episodesSlug) {
      const idea = await readIdea(userId, epSlug)
      if (idea && idea.statut === 'published') {
        preservedSlots.push(epSlug)
      } else {
        overwritableSlots.push(epSlug)
      }
    }

    const today = new Date().toISOString().split('T')[0]
    const newEpisodeSlugs: string[] = []
    const ts = Date.now().toString(36)  // compute once — avoids duplicate slugs in tight loop

    // Write episodes: overwrite slots first, then create new files
    for (let i = 0; i < generated.episodes.length; i++) {
      const ep = generated.episodes[i]
      const epSlug = overwritableSlots[i] ?? `${slugify(ep.sujet)}-${ts}-${i.toString(36)}`

      const idea: Idea = {
        slug: epSlug,
        sujet: ep.sujet,
        pilier: ep.pilier,
        format: ep.format as Format,
        statut: 'draft' as IdeaStatus,
        semaine: null,
        jour: null,
        createdAt: today,
        hook: ep.hook,
        texte: ep.texte,
        visuelType: ep.visuelType,
        visuelDescription: ep.visuelDescription,
        hashtags: ep.hashtags,
        campagne: body.slug,
      }
      await writeIdea(userId, idea)
      newEpisodeSlugs.push(epSlug)
    }

    // Update campaign file
    const updatedCampaign = {
      ...existing,
      brief: generated.brief,
      phases: generated.phases,
      statut: 'active' as const,
      contexte: body.contexte ?? existing.contexte,
      episodesSlug: [...preservedSlots, ...newEpisodeSlugs],
    }
    await writeCampaign(userId, updatedCampaign)

    return NextResponse.json(updatedCampaign)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
