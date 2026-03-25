import { describe, it, expect } from 'vitest'
import { parseWeeklyPlanResponse } from './generate-weekly-plan'

describe('parseWeeklyPlanResponse', () => {
  it('parses a valid WeeklyPlan JSON', () => {
    const plan = {
      semaine: 12,
      dateDebut: '2026-03-23',
      posts: [
        {
          type: 'campagne',
          jour: 'Mar',
          sujet: 'Pourquoi les projets IA échouent',
          pilier: 'IA & Transformation',
          hook: "On a tout raté. Et c'était prévisible.",
          justification: 'Épisode 1 de la campagne, pilier fort cette semaine.',
          sourceLabel: 'Campagne: Stratégie avant techno — Ép. 1',
          campagneSlug: 'la-strategie-avant-la-technologie',
          urgence: 'normale'
        }
      ],
      generatedAt: '2026-03-22T10:00:00Z'
    }
    const result = parseWeeklyPlanResponse(JSON.stringify(plan))
    expect(result.posts).toHaveLength(1)
    expect(result.posts[0].type).toBe('campagne')
    expect(result.posts[0].jour).toBe('Mar')
  })

  it('handles JSON wrapped in markdown fences', () => {
    const plan = { semaine: 1, dateDebut: '2026-01-06', posts: [], generatedAt: '' }
    const raw = '```json\n' + JSON.stringify(plan) + '\n```'
    const result = parseWeeklyPlanResponse(raw)
    expect(result.posts).toEqual([])
  })

  it('throws on unparseable response', () => {
    expect(() => parseWeeklyPlanResponse('not json')).toThrow()
  })
})
