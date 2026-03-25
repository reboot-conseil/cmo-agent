import Anthropic from '@anthropic-ai/sdk'
import type { VeilleItem, TokenUsage } from './types'
import { CMO_SYSTEM_PROMPT } from './prompts'

const VEILLE_PROMPT = `Effectue une recherche web et identifie les 5 sujets les plus pertinents de la semaine pour Jonathan BRAUN.

Jonathan est consultant IA & transformation organisationnelle (PME/ETI françaises). Son identité éditoriale :
- IA & Transformation (25%) — impact concret de l'IA sur les organisations
- Stratégie & Décision (20%) — pourquoi la stratégie prime sur la tech
- Business & ROI (20%) — cas concrets, POC, quick wins
- Neurosciences & Adoption (15%) — biais cognitifs, résistance au changement
- Innovation & Prospective (10%) — signaux faibles, tendances 2-5 ans
- Coulisses & Authenticité (10%) — leadership, facteur humain, management

Cherche des sujets sur : IA générative, transformation digitale, management du changement, leadership, adoption IA en entreprise, études/rapports IA, actualité tech française et européenne.

Pour chaque sujet, propose un angle SPÉCIFIQUE à Jonathan — pas générique, ancré dans son terrain PME/ETI.

Réponds UNIQUEMENT avec un tableau JSON valide (5 items exactement) :
[
  {
    "titre": "titre court et accrocheur du sujet",
    "resume": "2-3 phrases résumant l'essentiel",
    "source": "nom du média ou de la source",
    "pilier": "un des 6 piliers éditoriaux",
    "urgence": "haute | moyenne | basse",
    "angleJonathan": "angle concret et spécifique pour Jonathan (1-2 phrases)"
  }
]`

export function parseVeilleResponse(raw: string): VeilleItem[] {
  const text = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []
  try {
    return JSON.parse(match[0]) as VeilleItem[]
  } catch {
    return []
  }
}

export async function generateVeille(): Promise<{ items: VeilleItem[]; _tokens: TokenUsage }> {
  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: CMO_SYSTEM_PROMPT,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any,
    messages: [{ role: 'user', content: VEILLE_PROMPT }],
  })

  // Extract the final text block (after tool use rounds)
  const textBlock = [...response.content].reverse().find(b => b.type === 'text')
  const raw = textBlock?.type === 'text' ? textBlock.text : ''
  return { items: parseVeilleResponse(raw), _tokens: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens } }
}
