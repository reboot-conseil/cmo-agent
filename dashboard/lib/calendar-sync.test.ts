import { describe, it, expect } from 'vitest'
import { generateCalendarMd, groupByWeek } from './calendar-sync'
import type { Idea } from './types'

const IDEAS: Idea[] = [
  { slug: 'a', sujet: 'Post A', pilier: 'IA & Transformation', format: 'Post', statut: 'scheduled',
    semaine: 1, jour: 'Mar', createdAt: '2026-03-17', hook: 'Hook A', texte: '', visuelType: '', visuelDescription: '', hashtags: [] },
  { slug: 'b', sujet: 'Post B', pilier: 'Business & ROI', format: 'Carrousel', statut: 'scheduled',
    semaine: 1, jour: 'Jeu', createdAt: '2026-03-17', hook: 'Hook B', texte: '', visuelType: '', visuelDescription: '', hashtags: [] },
  { slug: 'c', sujet: 'Post C', pilier: 'Stratégie & Décision', format: 'Post', statut: 'published',
    semaine: 2, jour: 'Mer', createdAt: '2026-03-10', hook: 'Hook C', texte: '', visuelType: '', visuelDescription: '', hashtags: [] },
]

describe('groupByWeek', () => {
  it('groups ideas by semaine', () => {
    const grouped = groupByWeek(IDEAS)
    expect(grouped.get(1)).toHaveLength(2)
    expect(grouped.get(2)).toHaveLength(1)
  })

  it('ignores unscheduled ideas (null semaine)', () => {
    const withUnscheduled = [...IDEAS, {
      ...IDEAS[0], slug: 'd', semaine: null, jour: null,
    }]
    const grouped = groupByWeek(withUnscheduled)
    const total = Array.from(grouped.values()).flat().length
    expect(total).toBe(3)
  })
})

describe('generateCalendarMd', () => {
  it('contains ## Semaine N headings', () => {
    const md = generateCalendarMd(IDEAS)
    expect(md).toContain('## Semaine 1')
    expect(md).toContain('## Semaine 2')
  })

  it('contains table rows for each planned idea', () => {
    const md = generateCalendarMd(IDEAS)
    expect(md).toContain('Post A')
    expect(md).toContain('Post B')
  })

  it('includes statut emoji', () => {
    const md = generateCalendarMd(IDEAS)
    expect(md).toContain('📤') // published
    expect(md).toContain('⬜') // scheduled (not yet published)
  })

  it('produces valid markdown table rows (5 columns)', () => {
    const md = generateCalendarMd(IDEAS)
    const tableRows = md.split('\n').filter(l => l.startsWith('| Mar') || l.startsWith('| Mer') || l.startsWith('| Jeu'))
    expect(tableRows.length).toBeGreaterThan(0)
    tableRows.forEach(row => {
      expect(row.split('|').length - 2).toBeGreaterThanOrEqual(5)
    })
  })

  it('returns valid preamble with header and legend', () => {
    const md = generateCalendarMd(IDEAS)
    expect(md).toContain('# Calendrier éditorial')
    expect(md).toContain('⬜ À créer')
    expect(md).toContain('📤 Publié')
  })
})
