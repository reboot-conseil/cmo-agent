import Anthropic from '@anthropic-ai/sdk'
import type { WeeklyPlan, WeeklyPlanRequest, TokenUsage } from './types'
import { CMO_SYSTEM_PROMPT } from './prompts'

export function parseWeeklyPlanResponse(raw: string): WeeklyPlan {
  const text = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`No JSON object found in response: ${raw.slice(0, 200)}`)
  return JSON.parse(match[0]) as WeeklyPlan
}

export async function generateWeeklyPlan(req: WeeklyPlanRequest): Promise<WeeklyPlan & { _tokens: TokenUsage }> {
  const client = new Anthropic()

  const today = new Date()
  const monday = new Date(today)
  const dayOfWeek = today.getDay()
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7 || 7
  monday.setDate(today.getDate() + (dayOfWeek <= 1 ? 0 : daysUntilMonday))
  if (dayOfWeek > 1) monday.setDate(today.getDate() + daysUntilMonday)
  const dateDebut = monday.toISOString().split('T')[0]
  const startOfYear = new Date(monday.getFullYear(), 0, 1)
  const semaine = Math.ceil(((monday.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)

  const campaignsBlock = req.activeCampaigns.length > 0
    ? req.activeCampaigns.map(c =>
        `- "${c.titre}" (slug: ${c.slug})${c.nextEpisodeSujet ? ` → prochain épisode: "${c.nextEpisodeSujet}" (slug: ${c.nextEpisodeSlug})` : ' → aucun épisode disponible'}`
      ).join('\n')
    : 'Aucune campagne active.'

  const veilleBlock = req.veille.length > 0
    ? req.veille.map((v, i) =>
        `${i + 1}. [${v.urgence.toUpperCase()}] "${v.titre}" (${v.pilier})\n   Angle Jonathan : ${v.angleJonathan}`
      ).join('\n')
    : 'Aucune veille disponible.'

  const noteBlock = req.noteVocale.trim()
    ? `NOTES TERRAIN DE JONATHAN CETTE SEMAINE :\n${req.noteVocale}`
    : 'Pas de note vocale cette semaine.'

  const userPrompt = `Tu es le directeur éditorial de Jonathan BRAUN. Propose le plan de posts LinkedIn optimal pour la semaine du ${dateDebut}.

CONTRAINTES :
- Budget : ${req.budgetPosts} posts maximum (3 si semaine classique, 4-5 si sujet exceptionnel)
- Jours disponibles : Mar, Mer, Jeu (rarement Lun/Ven)
- Minimum 2 épisodes de campagne par semaine (backbone stratégique)
- Maximum 2 posts réactifs ou terrain par semaine
- Équilibre des piliers éditoriaux sur la semaine
- Type "campagne" : utilise les épisodes disponibles dans les campagnes actives
- Type "reactif" : inspiré d'un sujet de veille (urgence haute/moyenne seulement)
- Type "terrain" : inspiré de la note vocale de Jonathan
- Type "evergreen" : si backlog pertinent ou sujet intemporel

CAMPAGNES ACTIVES ET PROCHAINS ÉPISODES :
${campaignsBlock}

VEILLE IA DE LA SEMAINE :
${veilleBlock}

${noteBlock}

Réponds UNIQUEMENT avec un JSON valide :
{
  "semaine": ${semaine},
  "dateDebut": "${dateDebut}",
  "posts": [
    {
      "type": "campagne | reactif | terrain | evergreen",
      "jour": "Lun | Mar | Mer | Jeu | Ven",
      "sujet": "sujet précis du post",
      "pilier": "un des 6 piliers éditoriaux",
      "hook": "première ligne accrocheuse (1-2 lignes max)",
      "justification": "pourquoi ce post cette semaine (1-2 phrases)",
      "sourceLabel": "Campagne: [titre] — Ép. N | Veille: [titre] | Note vocale | Backlog",
      "campagneSlug": "slug-campagne-si-type-campagne (omit if not campagne)",
      "ideaSlug": "slug-idea-si-episode-existant (omit if not applicable)",
      "urgence": "haute | normale"
    }
  ],
  "generatedAt": "${new Date().toISOString()}"
}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: CMO_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  const _r = parseWeeklyPlanResponse(raw)
  return { ..._r, _tokens: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens } }
}
