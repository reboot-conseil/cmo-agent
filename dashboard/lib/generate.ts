import Anthropic from '@anthropic-ai/sdk'
import type { GenerateRequest, GenerateResponse, TokenUsage } from './types'
import { CMO_SYSTEM_PROMPT } from './prompts'

const client = new Anthropic() // uses ANTHROPIC_API_KEY env var

export async function generateIdeaContent(req: GenerateRequest): Promise<GenerateResponse & { _tokens: TokenUsage }> {
  const formatInstructions: Record<string, string> = {
    'Post': 'Post LinkedIn classique (800-1300 caractères)',
    'Carrousel': 'Brief textuel pour carrousel LinkedIn (10 slides max, 1 idée par slide)',
    'Article': 'Article long LinkedIn (1500-3000 mots)',
    'Vidéo': 'Script vidéo courte (60-120 secondes, indications de ton et de rythme)',
    'Newsletter': 'Newsletter LinkedIn (500-800 mots, édito + sujet de fond)',
  }

  const userPrompt = `Génère le contenu complet pour ce ${req.format} LinkedIn.

Sujet brut : ${req.sujet}
Pilier : ${req.pilier}
Format : ${formatInstructions[req.format] ?? req.format}
${req.direction ? `Direction / contexte : ${req.direction}` : ''}

Réponds UNIQUEMENT avec un JSON valide (pas de markdown autour) avec cette structure exacte :
{
  "hook": "première ligne accrocheuse (1-2 lignes max, visible avant 'voir plus')",
  "texte": "corps complet du ${req.format}",
  "visuelType": "type court ex: 'Photo authentique' | 'Illustration IA' | 'Slides carrousel' | 'Script vidéo' | 'Schéma'",
  "visuelDescription": "description détaillée et actionnable de ce qu'il faut produire comme visuel",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"]
}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: CMO_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  const text = (raw.match(/\{[\s\S]*\}/) ?? [raw])[0]
  try {
    const _r = JSON.parse(text) as GenerateResponse
    return { ..._r, _tokens: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens } }
  } catch {
    throw new Error(`Claude returned non-JSON response: ${raw.slice(0, 200)}`)
  }
}
