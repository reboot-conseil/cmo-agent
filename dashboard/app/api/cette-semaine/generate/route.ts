import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { checkUsage, recordUsage } from '@/lib/usage'
import { listCampaigns } from '@/lib/parse-campaigns'
import { readIdea } from '@/lib/parse-ideas'
import { generateWeeklyPlan } from '@/lib/generate-weekly-plan'
import type { WeeklyPlanRequest } from '@/lib/types'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  try {
    const body = await request.json() as Pick<WeeklyPlanRequest, 'noteVocale' | 'veille'>

    const allCampaigns = await listCampaigns(userId)
    const activeCampaigns = await Promise.all(
      allCampaigns
        .filter(c => c.statut === 'active')
        .map(async c => {
          const ideas = await Promise.all(c.episodesSlug.map(slug => readIdea(userId, slug)))
          const nextEp = ideas.find(idea => idea && idea.statut !== 'published')
          return {
            slug: c.slug,
            titre: c.titre,
            nextEpisodeSujet: nextEp?.sujet,
            nextEpisodeSlug: nextEp?.slug,
            pilier: nextEp?.pilier,
          }
        })
    )

    const hasHotTopic = (body.veille ?? []).some(v => v.urgence === 'haute')
    const budgetPosts = hasHotTopic ? 4 : 3

    await checkUsage(userId)
    const { _tokens, ...plan } = await generateWeeklyPlan({
      noteVocale: body.noteVocale ?? '',
      veille: body.veille ?? [],
      activeCampaigns,
      budgetPosts,
    })

    recordUsage(userId, _tokens.inputTokens, _tokens.outputTokens).catch(() => {})
    return NextResponse.json({ plan })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
