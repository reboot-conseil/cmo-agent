import Anthropic from '@anthropic-ai/sdk'
import { listIdeas } from './parse-ideas'
import { readGenerationLog } from './generation-log'
import { readVision } from './vision'
import { storageGet } from './storage'
import { CMO_SYSTEM_PROMPT } from './prompts'
import type { GeneratePlanRequest, GeneratePlanResponse, TokenUsage } from './types'

const client = new Anthropic()

export async function readIdeasSummary(userId: string): Promise<string> {
  const ideas = (await listIdeas(userId)).slice(0, 50)
  if (ideas.length === 0) return 'Aucune idée dans le backlog.'
  const lines = ideas.map(i => `- "${i.sujet}" [${i.pilier}]`).join('\n')
  return `Idées existantes (${ideas.length}) :\n${lines}`
}

export async function readIdeasSummaryFull(userId: string): Promise<string> {
  const ideas = (await listIdeas(userId)).slice(0, 100)
  if (ideas.length === 0) return 'Aucune idée dans le backlog.'
  const lines = ideas.map(i => `- "${i.sujet}" [${i.pilier}] (${i.statut})`).join('\n')
  return `Idées existantes (${ideas.length}) :\n${lines}`
}

export async function generateStrategyPlan(userId: string, req: GeneratePlanRequest): Promise<GeneratePlanResponse & { _tokens: TokenUsage }> {
  const [claudeMd, logSummary, ideasSummary, visionData] = await Promise.all([
    storageGet(userId, 'identity.md'),
    readGenerationLog(userId),
    readIdeasSummary(userId),
    readVision(userId),
  ])
  const identity = claudeMd ?? ''

  const userPrompt = `Tu dois proposer un plan de contenu LinkedIn stratégique pour ${req.semaines} semaines.
${req.contexte ? `\nContexte fourni par Jonathan : ${req.contexte}\n` : ''}
---

## Profil et positionnement (identity.md)

${identity}

---

## Historique des générations précédentes (à éviter pour ne pas répéter)

${logSummary}

---

## Idées déjà dans le backlog (à éviter les doublons)

${ideasSummary}

${visionData.visionIA ? `---

## Vision stratégique actuelle

Situation : ${visionData.visionIA.situationActuelle}
Direction : ${visionData.visionIA.directionRecommandee}
${visionData.noteJonathan ? `Note Jonathan : ${visionData.noteJonathan}` : ''}
` : ''}---

## Consigne

Propose entre 3 et 6 campagnes LinkedIn cohérentes pour couvrir ${req.semaines} semaines.
Équilibre les piliers thématiques. Évite les sujets déjà couverts récemment.
Pour chaque campagne, fournis un "rationale" expliquant pourquoi cette campagne est pertinente maintenant.

Réponds UNIQUEMENT avec un JSON valide (pas de markdown autour) :
{
  "campaigns": [
    {
      "titre": "Titre de la campagne",
      "format": "Post | Carrousel | Article | Vidéo | Newsletter | Mix",
      "duree": 2, // en mois
      "objectif": "Objectif stratégique en 1 phrase",
      "pilier": "un des 6 piliers",
      "rationale": "Pourquoi cette campagne maintenant, en 2-3 phrases"
    }
  ]
}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: CMO_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  const text = (raw.match(/\{[\s\S]*\}/) ?? [raw])[0]
  try {
    return { ...JSON.parse(text) as GeneratePlanResponse, _tokens: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens } }
  } catch {
    throw new Error(`Claude returned non-JSON response: ${text.slice(0, 300)}`)
  }
}
