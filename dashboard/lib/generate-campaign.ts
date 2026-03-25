import Anthropic from '@anthropic-ai/sdk'
import type { CampaignGenerateRequest, CampaignGenerateResponse, Format, TokenUsage } from './types'
import { CMO_SYSTEM_PROMPT } from './prompts'

const client = new Anthropic()

const FORMAT_INSTRUCTIONS: Record<string, string> = {
  'Post': 'Post LinkedIn classique (800-1300 caractères)',
  'Carrousel': 'Brief textuel pour carrousel LinkedIn (10 slides max, 1 idée par slide)',
  'Article': 'Article long LinkedIn (1500-3000 mots)',
  'Vidéo': 'Script vidéo courte (60-120 secondes, indications de ton et de rythme)',
  'Newsletter': 'Newsletter LinkedIn (500-800 mots, édito + sujet de fond)',
  'Mix': 'Mix de formats (Posts, Carrousels, Vidéos) — choisis le meilleur format pour chaque épisode',
}

export async function generateCampaign(req: CampaignGenerateRequest): Promise<CampaignGenerateResponse & { _tokens: TokenUsage }> {
  const maxEpisodes = req.maxEpisodes ?? 12
  const formatLabel = FORMAT_INSTRUCTIONS[req.format] ?? req.format

  const userPrompt = `Génère une campagne LinkedIn complète.

Titre : ${req.titre}
Format : ${formatLabel}
Durée : ${req.duree} mois
Objectif : ${req.objectif}
${req.contexte ? `Contexte : ${req.contexte}` : ''}
Nombre maximum d'épisodes : ${maxEpisodes}

Détermine toi-même le nombre d'épisodes optimal en fonction du format et de la durée (ne dépasse pas ${maxEpisodes}).

Réponds UNIQUEMENT avec un JSON valide (pas de markdown autour) avec cette structure exacte :
{
  "brief": "description stratégique de la campagne en 3-5 phrases",
  "phases": "découpage en phases ex: Mois 1-2 : Awareness → Mois 3 : Conversion",
  "episodes": [
    {
      "sujet": "sujet précis de l'épisode",
      "pilier": "un des 6 piliers : IA & Transformation | Stratégie & Décision | Business & ROI | Neurosciences & Adoption | Innovation & Prospective | Coulisses & Authenticité",
      "format": "Post | Carrousel | Article | Vidéo | Newsletter",
      "hook": "première ligne accrocheuse (1-2 lignes max)",
      "texte": "corps complet du contenu",
      "visuelType": "Photo authentique | Illustration IA | Slides carrousel | Script vidéo | Schéma",
      "visuelDescription": "description détaillée et actionnable du visuel à produire",
      "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"]
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
    const parsed = JSON.parse(text) as CampaignGenerateResponse
    // Enforce cap
    parsed.episodes = parsed.episodes.slice(0, maxEpisodes)
    return { ...parsed, _tokens: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens } }
  } catch {
    throw new Error(`Claude returned non-JSON response: ${raw.slice(0, 300)}`)
  }
}
