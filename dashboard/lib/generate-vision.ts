import Anthropic from '@anthropic-ai/sdk'
import { CMO_SYSTEM_PROMPT } from './prompts'
import { readFullGenerationLog } from './generation-log'
import { readIdeasSummaryFull } from './generate-strategy'
import { readVision } from './vision'
import { storageGet } from './storage'
import type { VisionResponse, TokenUsage } from './types'

const client = new Anthropic()

export async function generateVision(userId: string): Promise<VisionResponse & { _tokens: TokenUsage }> {
  const [claudeMd, fullLog, ideasSummary, visionData] = await Promise.all([
    storageGet(userId, 'identity.md'),
    readFullGenerationLog(userId),
    readIdeasSummaryFull(userId),
    readVision(userId),
  ])
  const identity = claudeMd ?? ''

  const noteSection = visionData.noteJonathan
    ? `\n## Note/contexte de Jonathan\n\n${visionData.noteJonathan}\n`
    : ''

  const userPrompt = `Tu es le stratège éditorial de Jonathan BRAUN. Analyse les données suivantes et génère une vision stratégique structurée.

## Profil complet (identity.md)

${identity}

---

## Historique complet des générations

${fullLog}

---

## Backlog d'idées (top 100 avec statut)

${ideasSummary}
${noteSection}
---

## Consigne

Génère une vision stratégique pour guider les prochaines générations de contenu.
Analyse les patterns, identifie les thèmes surexploités, et propose une direction claire.

Réponds UNIQUEMENT avec un JSON valide (pas de markdown autour) :
{
  "situationActuelle": "résumé de l'état actuel en 2-3 phrases",
  "directionRecommandee": "cap stratégique pour les 3 prochains mois en 2-3 phrases",
  "priorites": ["thème 1", "thème 2", "thème 3"],
  "themesAEviter": ["sujet saturé 1", "sujet saturé 2"],
  "coherence": "analyse de cohérence avec CLAUDE.md en 2 phrases"
}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: CMO_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  const text = (raw.match(/\{[\s\S]*\}/) ?? [raw])[0]
  try {
    return { ...JSON.parse(text) as VisionResponse, _tokens: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens } }
  } catch {
    throw new Error(`Claude returned non-JSON response: ${raw.slice(0, 300)}`)
  }
}
