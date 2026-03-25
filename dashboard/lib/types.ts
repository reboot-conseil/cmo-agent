export type TokenUsage = { inputTokens: number; outputTokens: number }

export type IdeaStatus = 'raw' | 'draft' | 'ready' | 'scheduled' | 'published'
export type Format = 'Post' | 'Carrousel' | 'Article' | 'Vidéo' | 'Newsletter'
export type Jour = 'Lun' | 'Mar' | 'Mer' | 'Jeu' | 'Ven'

export type Idea = {
  slug: string
  sujet: string
  pilier: string
  format: Format
  statut: IdeaStatus
  semaine: number | null
  jour: Jour | null
  createdAt: string
  hook: string
  texte: string
  visuelType: string        // 'Photo authentique' | 'Illustration IA' | 'Slides carrousel' | 'Script vidéo' | ...
  visuelDescription: string // description détaillée de ce qu'il faut produire
  hashtags: string[]
  campagne?: string
}

export type IdeaFrontmatter = {
  slug: string
  sujet: string
  pilier: string
  format: Format
  statut: IdeaStatus
  semaine: number | null
  jour: Jour | null
  createdAt: string
}

export type GenerateRequest = {
  slug: string
  sujet: string
  pilier: string
  format: Format
  direction?: string   // contexte optionnel pour guider la régénération
}

export type GenerateResponse = {
  hook: string
  texte: string
  visuelType: string
  visuelDescription: string
  hashtags: string[]
}

export type CalendarSlot = {
  semaine: number
  jour: Jour
  idea: Idea | null
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export type CampaignStatus = 'draft' | 'active' | 'completed'

export type Campaign = {
  slug: string
  titre: string
  format: Format | 'Mix'
  duree: number           // en mois
  objectif: string
  statut: CampaignStatus
  createdAt: string
  brief: string
  phases: string
  episodesSlug: string[]  // slugs des Idea dans content/ideas/
  contexte: string        // string libre mergé depuis les 4 champs UI
}

export type CampaignGenerateRequest = {
  slug: string
  titre: string
  format: Format | 'Mix'
  duree: number
  objectif: string
  contexte?: string
  maxEpisodes?: number    // plafond strict côté serveur, default 12
}

export type CampaignGenerateResponse = {
  brief: string
  phases: string
  episodes: Array<{
    sujet: string
    pilier: string
    format: Format
    hook: string
    texte: string
    visuelType: string
    visuelDescription: string
    hashtags: string[]
  }>
}

// ─── Strategy Engine ──────────────────────────────────────────────────────────

export type ProposedCampaign = {
  titre: string
  format: Format | 'Mix'
  duree: number
  objectif: string
  pilier: string
  rationale: string
}

export type GeneratePlanRequest = {
  semaines: number
  contexte?: string
}

export type GeneratePlanResponse = {
  campaigns: ProposedCampaign[]
}

export type GenerationEntry = {
  date: string
  semaines: number
  campaigns: Array<{ titre: string; pilier: string; episodesCount: number }>
}

// ─── Strategy Memory ──────────────────────────────────────────────────────────

export type CLAUDEMdSections = {
  identite: string
  convictions: string[]
  piliers: Array<{ num: number; nom: string; angle: string; frequence: string }>
  audience: Array<{ type: string; douleur: string; cherche: string }>
  voix: string
}

export type VisionResponse = {
  situationActuelle: string
  directionRecommandee: string
  priorites: string[]
  themesAEviter: string[]
  coherence: string
}

export type VisionData = {
  visionIA: VisionResponse | null
  noteJonathan: string
  generatedAt: string | null
}

// ─── Cette Semaine ─────────────────────────────────────────────────────────────

export type VeilleItem = {
  titre: string
  resume: string          // 2-3 sentences
  source: string          // domain or outlet name
  pilier: string          // one of the 6 editorial pillars
  urgence: 'haute' | 'moyenne' | 'basse'
  angleJonathan: string   // concrete angle tailored to Jonathan's identity
}

export type WeeklyPostType = 'campagne' | 'reactif' | 'terrain' | 'evergreen'

export type WeeklyPost = {
  type: WeeklyPostType
  jour: Jour
  sujet: string
  pilier: string          // one of the 6 editorial pillars
  hook: string            // suggested opening line
  justification: string   // why this post this week (1-2 sentences)
  sourceLabel: string     // e.g. "Campagne X — Ép. 3" | "Veille: [titre]" | "Note vocale"
  campagneSlug?: string   // set when type === 'campagne'
  ideaSlug?: string       // set when an existing idea can be reused
  urgence: 'haute' | 'normale'
}

export type WeeklyPlan = {
  semaine: number
  dateDebut: string       // ISO date of the Monday
  posts: WeeklyPost[]
  generatedAt: string
}

export type VeilleGenerateResponse = {
  items: VeilleItem[]
}

export type WeeklyPlanRequest = {
  noteVocale: string
  veille: VeilleItem[]
  activeCampaigns: Array<{
    slug: string
    titre: string
    nextEpisodeSujet?: string
    nextEpisodeSlug?: string
    pilier?: string
  }>
  budgetPosts: number
}

export type WeeklyPlanResponse = {
  plan: WeeklyPlan
}
