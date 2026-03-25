import Anthropic from '@anthropic-ai/sdk'
import type { Format, TokenUsage } from './types'
import { CMO_SYSTEM_PROMPT } from './prompts'

const VALID_PILIERS = [
  'IA & Transformation',
  'Stratégie & Décision',
  'Business & ROI',
  'Neurosciences & Adoption',
  'Innovation & Prospective',
  'Coulisses & Authenticité',
]

const VALID_FORMATS: Format[] = ['Post', 'Carrousel', 'Article', 'Vidéo', 'Newsletter']

const QUICK_POST_FALLBACK = {
  pilier: 'IA & Transformation',
  format: 'Post' as Format,
  hook: '',
}

export type QuickPostResult = {
  pilier: string
  format: Format
  hook: string
  texte: string
  visuelType: string
  visuelDescription: string
  hashtags: string[]
}

const QUICK_POST_PROMPT = (sujet: string) => `À partir du sujet suivant, génère le contenu LinkedIn complet pour Jonathan BRAUN.

Sujet brut : "${sujet}"

Étape 1 — Choisis le pilier éditorial le plus pertinent (texte exact) :
- IA & Transformation (25%) — impact concret de l'IA sur les organisations
- Stratégie & Décision (20%) — pourquoi la stratégie prime sur la tech
- Business & ROI (20%) — cas concrets, POC, quick wins, chiffres
- Neurosciences & Adoption (15%) — biais cognitifs, résistance au changement
- Innovation & Prospective (10%) — signaux faibles, tendances 2-5 ans
- Coulisses & Authenticité (10%) — parcours, équipe, apprentissages, vulnérabilité

Étape 2 — Choisis le format :
- Post (par défaut — 800-1300 caractères)
- Carrousel (si le sujet se prête à une liste, étapes, comparaison ou framework visuel)
- Article, Vidéo, Newsletter (si le sujet l'exige clairement)

Étape 3 — Génère le contenu complet en respectant la voix de Jonathan :
- Assertif mais humble, ancré dans le terrain PME/ETI
- Phrases courtes, paragraphes aérés (2-3 lignes max)
- Hook : 1-2 lignes avant "voir plus", percutant, pas de "Je suis ravi de..."
- 3-5 hashtags en fin de post uniquement, pas dans le corps
- Maximum 3-4 émojis par post

Réponds UNIQUEMENT avec un objet JSON valide :
{
  "pilier": "un des 6 piliers ci-dessus (texte exact)",
  "format": "Post | Carrousel | Article | Vidéo | Newsletter",
  "hook": "1-2 lignes d'accroche",
  "texte": "corps complet du contenu",
  "visuelType": "Photo authentique | Illustration IA | Slides carrousel | Script vidéo | Schéma",
  "visuelDescription": "description détaillée et actionnable du visuel à produire",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"]
}`

const FALLBACK_RESULT: QuickPostResult = {
  ...QUICK_POST_FALLBACK,
  texte: '',
  visuelType: 'Photo authentique',
  visuelDescription: '',
  hashtags: [],
}

export function parseQuickPostResponse(raw: string): QuickPostResult {
  const text = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return { ...FALLBACK_RESULT }
  try {
    const parsed = JSON.parse(match[0]) as Partial<QuickPostResult>
    const pilier = VALID_PILIERS.includes(parsed.pilier ?? '') ? (parsed.pilier as string) : QUICK_POST_FALLBACK.pilier
    const format = VALID_FORMATS.includes(parsed.format as Format) ? (parsed.format as Format) : QUICK_POST_FALLBACK.format
    const hook = typeof parsed.hook === 'string' ? parsed.hook : ''
    const texte = typeof parsed.texte === 'string' ? parsed.texte : ''
    const visuelType = typeof parsed.visuelType === 'string' && parsed.visuelType.length > 0 ? parsed.visuelType : 'Photo authentique'
    const visuelDescription = typeof parsed.visuelDescription === 'string' ? parsed.visuelDescription : ''
    const hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags as string[] : []
    return { pilier, format, hook, texte, visuelType, visuelDescription, hashtags }
  } catch {
    return { ...FALLBACK_RESULT }
  }
}

export async function generateQuickPost(sujet: string): Promise<QuickPostResult & { _tokens: TokenUsage }> {
  const client = new Anthropic()
  // No tool use — single text block guaranteed, no need for reverse().find()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: CMO_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: QUICK_POST_PROMPT(sujet) }],
  })
  const textBlock = response.content.find(b => b.type === 'text')
  const raw = textBlock?.type === 'text' ? textBlock.text : ''
  return { ...parseQuickPostResponse(raw), _tokens: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens } }
}
