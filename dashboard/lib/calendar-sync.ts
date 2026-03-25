import type { Idea, Jour } from './types'
import { storagePut } from './storage'

const CALENDAR_PATH = 'content/calendar.md'

const JOUR_ORDER: Jour[] = ['Mar', 'Mer', 'Jeu']

export function groupByWeek(ideas: Idea[]): Map<number, Idea[]> {
  const map = new Map<number, Idea[]>()
  for (const idea of ideas) {
    if (idea.semaine === null || idea.jour === null) continue
    const existing = map.get(idea.semaine) ?? []
    map.set(idea.semaine, [...existing, idea])
  }
  return map
}

export function generateCalendarMd(ideas: Idea[]): string {
  const grouped = groupByWeek(ideas)
  const semaines = Array.from(grouped.keys()).sort((a, b) => a - b)

  const preamble = `# Calendrier éditorial — Agent CMO

## Phase actuelle : LANCEMENT (Mois 1-2)
**Rythme : 3 posts/semaine (Mardi - Mercredi - Jeudi)**

---

## Rotation hebdomadaire type

| Jour | Pilier | Format | Objectif |
|------|--------|--------|----------|
| 🗓 Mardi | IA & Transformation OU Stratégie & Décision | Post classique | Insight fort |
| 🗓 Mercredi | Business & ROI OU Neurosciences & Adoption | Post ou carrousel | Valeur concrète |
| 🗓 Jeudi | Coulisses OU Innovation | Post personnel | Humanisation |

---

`

  const semaineBlocks = semaines.map(semaine => {
    const sIdeas = grouped.get(semaine)!
    const ideasByJour = new Map<Jour, Idea>()
    for (const idea of sIdeas) {
      if (idea.jour) ideasByJour.set(idea.jour, idea)
    }

    const rows = JOUR_ORDER.map(jour => {
      const idea = ideasByJour.get(jour)
      if (!idea) return `| ${jour} | | | | ⬜ À créer |`
      const label = idea.statut === 'published' ? '📤 Publié' :
                    idea.statut === 'ready'     ? '✅ Validé' :
                    idea.statut === 'draft'     ? '✏️ Draft en cours' : '⬜ À créer'
      return `| ${jour} | ${idea.pilier} | ${idea.sujet} | ${idea.hook || '—'} | ${label} |`
    })

    return [
      `## Semaine ${semaine} — [EN COURS]`,
      '',
      '| Jour | Pilier | Sujet | Hook | Statut |',
      '|------|--------|-------|------|--------|',
      ...rows,
      '',
    ].join('\n')
  }).join('\n')

  const legend = `\n---\n\n## Légende statuts\n\n- ⬜ À créer\n- ✏️ Draft en cours\n- 👀 En attente de validation\n- ✅ Validé, prêt à publier\n- 📤 Publié\n`

  return preamble + semaineBlocks + legend
}

export async function syncCalendarFile(userId: string, ideas: Idea[]): Promise<void> {
  const md = generateCalendarMd(ideas)
  await storagePut(userId, CALENDAR_PATH, md)
}
