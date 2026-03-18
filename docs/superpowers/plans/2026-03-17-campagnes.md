# Campagnes Feature Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/campagnes` page to the CMO Dashboard that lets Jonathan create, generate, and manage multi-episode content campaigns via Claude AI.

**Architecture:** File-per-campaign markdown in `content/campagnes/<slug>.md`, parsed with `gray-matter`. Generated episodes become normal `Idea` files in `content/ideas/` tagged with `campagne: <slug>`. Three-column UI (list / detail / generator) mirroring the existing dashboard pattern, backed by four new API routes.

**Tech Stack:** Next.js 15 App Router, TypeScript, Vitest, gray-matter, Anthropic SDK (already installed), Tailwind/inline styles (follow existing pattern).

> **Note for all `git add` commands:** All git commands are run from `cd /Users/jonathanbraun/cmo-agent/dashboard`. Paths in `git add` are relative to that directory (e.g. `lib/types.ts`, not `dashboard/lib/types.ts`).

**Run tests:** `cd /Users/jonathanbraun/cmo-agent/dashboard && npm test`
**Dev server:** `cd /Users/jonathanbraun/cmo-agent/dashboard && ANTHROPIC_API_KEY=<key> npm run dev`

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `dashboard/lib/types.ts` | Add Campaign types; add `campagne?` to Idea |
| Modify | `dashboard/lib/parse-ideas.ts` | Read/write `campagne` field |
| Modify | `dashboard/lib/parse-ideas.test.ts` | Cover `campagne` field |
| Create | `dashboard/lib/parse-campaigns.ts` | CRUD for campaign markdown files (gray-matter) |
| Create | `dashboard/lib/parse-campaigns.test.ts` | Vitest tests for parse-campaigns |
| Create | `dashboard/lib/generate-campaign.ts` | Claude API call → Campaign content + episodes |
| Create | `dashboard/app/api/campagnes/route.ts` | GET list + POST create |
| Create | `dashboard/app/api/campagnes/[slug]/route.ts` | PATCH update |
| Create | `dashboard/app/api/campagnes/generate/route.ts` | POST generate (Claude) |
| Create | `dashboard/context/CampaignContext.tsx` | Client state: selectedSlug + campaigns list |
| Create | `dashboard/components/CampaignList.tsx` | Left column: list + new campaign form |
| Create | `dashboard/components/CampaignDetail.tsx` | Center column: brief, phases, episodes |
| Create | `dashboard/components/CampaignGenerator.tsx` | Right column: context fields + generate button |
| Create | `dashboard/app/campagnes/page.tsx` | Server page component |
| Modify | `dashboard/components/Sidebar.tsx` | Add Campagnes nav entry |

---

## Task 1: Install gray-matter

**Files:**
- Modify: `dashboard/package.json` (via npm)

- [ ] **Step 1: Install dependency**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npm install gray-matter
```

Expected: `added 1 package` (or similar), no errors.

- [ ] **Step 2: Run existing tests to confirm nothing broke**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npm test
```

Expected: all 23 tests pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && git add package.json package-lock.json && git commit -m "chore: add gray-matter for campaign frontmatter parsing"

```

---

## Task 2: Add Campaign types + extend Idea

**Files:**
- Modify: `dashboard/lib/types.ts`

- [ ] **Step 1: Add new types to `dashboard/lib/types.ts`**

Append at the end of the file:

```ts
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
```

Also add `campagne?: string` to the `Idea` type (after `hashtags`):

```ts
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
  visuelType: string
  visuelDescription: string
  hashtags: string[]
  campagne?: string       // slug de la campagne parente, si applicable
}
```

- [ ] **Step 2: Run tests to confirm no type errors**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npm test
```

Expected: all 23 tests pass (no changes to runtime behavior yet).

- [ ] **Step 3: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && git add lib/types.ts && git commit -m "feat(types): add Campaign types and campagne field to Idea"
```

---

## Task 3: Extend parse-ideas.ts for campagne field

**Files:**
- Modify: `dashboard/lib/parse-ideas.ts`
- Modify: `dashboard/lib/parse-ideas.test.ts`

- [ ] **Step 1: Write failing test for campagne field**

Add to `dashboard/lib/parse-ideas.test.ts`, inside the `parseIdeaFile` describe block:

```ts
it('reads campagne field when present', () => {
  const content = SAMPLE_CONTENT.replace(
    'createdAt: 2026-03-17',
    'createdAt: 2026-03-17\ncampagne: mini-series-ia'
  )
  const idea = parseIdeaFile(content, 'test-idea-sample')
  expect(idea.campagne).toBe('mini-series-ia')
})

it('campagne is undefined when absent', () => {
  const idea = parseIdeaFile(SAMPLE_CONTENT, 'test-idea-sample')
  expect(idea.campagne).toBeUndefined()
})
```

Add to the `serializeIdea` describe block:

```ts
it('round-trips campagne field', () => {
  const content = SAMPLE_CONTENT.replace(
    'createdAt: 2026-03-17',
    'createdAt: 2026-03-17\ncampagne: mini-series-ia'
  )
  const original = parseIdeaFile(content, 'test-idea-sample')
  const serialized = serializeIdea(original)
  const reparsed = parseIdeaFile(serialized, 'test-idea-sample')
  expect(reparsed.campagne).toBe('mini-series-ia')
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npm test -- parse-ideas
```

Expected: exactly 2 tests FAIL:
- `reads campagne field when present` → `received undefined, expected 'mini-series-ia'`
- `round-trips campagne field` → same reason

`campagne is undefined when absent` will PASS immediately (the field is not yet mapped, so it returns `undefined` as expected).

- [ ] **Step 3: Update parseIdeaFile to read campagne**

In `dashboard/lib/parse-ideas.ts`, add `campagne` to the returned object in `parseIdeaFile`:

```ts
return {
  slug: (data.slug as string) ?? slug,
  sujet: (data.sujet as string) ?? '',
  pilier: (data.pilier as string) ?? '',
  format: (data.format as Format) ?? 'Post',
  statut: (data.statut as IdeaStatus) ?? 'raw',
  semaine: data.semaine as number | null,
  jour: (data.jour as Jour) ?? null,
  createdAt: (data.createdAt as string) ?? new Date().toISOString().split('T')[0],
  hook: extractSection(body, 'Hook'),
  texte: extractSection(body, 'Texte'),
  visuelType,
  visuelDescription,
  hashtags: parseHashtags(extractSection(body, 'Hashtags')),
  campagne: data.campagne ? (data.campagne as string) : undefined,
}
```

- [ ] **Step 4: Update serializeIdea to write campagne**

In `serializeIdea`, update the frontmatter array to include campagne when present:

```ts
export function serializeIdea(idea: Idea): string {
  const fm = [
    '---',
    `slug: ${idea.slug}`,
    `sujet: ${idea.sujet}`,
    `pilier: ${idea.pilier}`,
    `format: ${idea.format}`,
    `statut: ${idea.statut}`,
    `semaine: ${idea.semaine ?? 'null'}`,
    `jour: ${idea.jour ?? 'null'}`,
    `createdAt: ${idea.createdAt}`,
    ...(idea.campagne ? [`campagne: ${idea.campagne}`] : []),
    '---',
    '',
  ].join('\n')
  // ... rest unchanged
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npm test -- parse-ideas
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && git add lib/parse-ideas.ts lib/parse-ideas.test.ts && git commit -m "feat(ideas): read/write optional campagne field in idea files"
```

---

## Task 4: parse-campaigns.ts + tests

**Files:**
- Create: `dashboard/lib/parse-campaigns.ts`
- Create: `dashboard/lib/parse-campaigns.test.ts`
- Reads: `dashboard/lib/parse-ideas.ts` — imports `extractSection` (already exported at line 23)

- [ ] **Step 1: Write failing tests — create `dashboard/lib/parse-campaigns.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { parseCampaignFile, serializeCampaign } from './parse-campaigns'
import type { Campaign } from './types'

const SAMPLE_CAMPAIGN = `---
slug: mini-series-ia
titre: Mini-séries IA pour dirigeants
format: Vidéo
duree: 3
objectif: Positionnement expert + notoriété
statut: draft
createdAt: 2026-03-17
episodesSlug:
  - mini-series-ia-ep01-abc123
  - mini-series-ia-ep02-def456
contexte: "Audience : dirigeants PME"
---

## Brief

Description stratégique de la campagne.

## Phases

Mois 1-2 : Awareness → Mois 3 : Conversion
`

describe('parseCampaignFile', () => {
  it('parses scalar frontmatter fields', () => {
    const c = parseCampaignFile(SAMPLE_CAMPAIGN)
    expect(c.slug).toBe('mini-series-ia')
    expect(c.titre).toBe('Mini-séries IA pour dirigeants')
    expect(c.format).toBe('Vidéo')
    expect(c.duree).toBe(3)
    expect(c.statut).toBe('draft')
    expect(c.createdAt).toBe('2026-03-17')
    expect(c.objectif).toBe('Positionnement expert + notoriété')
    expect(c.contexte).toBe('Audience : dirigeants PME')
  })

  it('parses episodesSlug as array', () => {
    const c = parseCampaignFile(SAMPLE_CAMPAIGN)
    expect(c.episodesSlug).toEqual(['mini-series-ia-ep01-abc123', 'mini-series-ia-ep02-def456'])
  })

  it('parses brief section', () => {
    const c = parseCampaignFile(SAMPLE_CAMPAIGN)
    expect(c.brief).toContain('Description stratégique')
  })

  it('parses phases section', () => {
    const c = parseCampaignFile(SAMPLE_CAMPAIGN)
    expect(c.phases).toContain('Awareness')
  })

  it('handles empty episodesSlug', () => {
    const content = SAMPLE_CAMPAIGN.replace(/episodesSlug:[\s\S]*?contexte/, 'episodesSlug: []\ncontexte')
    const c = parseCampaignFile(content)
    expect(c.episodesSlug).toEqual([])
  })
})

describe('serializeCampaign / parseCampaignFile round-trip', () => {
  it('round-trips all fields', () => {
    const original = parseCampaignFile(SAMPLE_CAMPAIGN)
    const serialized = serializeCampaign(original)
    const reparsed = parseCampaignFile(serialized)
    expect(reparsed.slug).toBe(original.slug)
    expect(reparsed.titre).toBe(original.titre)
    expect(reparsed.episodesSlug).toEqual(original.episodesSlug)
    expect(reparsed.brief).toBe(original.brief)
    expect(reparsed.phases).toBe(original.phases)
    expect(reparsed.contexte).toBe(original.contexte)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npm test -- parse-campaigns
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `dashboard/lib/parse-campaigns.ts`**

```ts
import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import type { Campaign, CampaignStatus, Format } from './types'
import { extractSection } from './parse-ideas'

const CMO_BASE = process.env.CMO_BASE ?? '/Users/jonathanbraun/cmo-agent'
const CAMPAIGNS_DIR = path.join(CMO_BASE, 'content/campagnes')

// ─── Parse ────────────────────────────────────────────────────────────────────

export function parseCampaignFile(raw: string): Campaign {
  const { data, content } = matter(raw)
  return {
    slug: String(data.slug ?? ''),
    titre: String(data.titre ?? ''),
    format: (data.format as Format | 'Mix') ?? 'Post',
    duree: Number(data.duree ?? 1),
    objectif: String(data.objectif ?? ''),
    statut: (data.statut as CampaignStatus) ?? 'draft',
    createdAt: String(data.createdAt ?? new Date().toISOString().split('T')[0]),
    episodesSlug: Array.isArray(data.episodesSlug) ? (data.episodesSlug as string[]) : [],
    contexte: String(data.contexte ?? ''),
    brief: extractSection(content, 'Brief'),
    phases: extractSection(content, 'Phases'),
  }
}

// ─── Serialize ────────────────────────────────────────────────────────────────

export function serializeCampaign(c: Campaign): string {
  const frontmatter = {
    slug: c.slug,
    titre: c.titre,
    format: c.format,
    duree: c.duree,
    objectif: c.objectif,
    statut: c.statut,
    createdAt: c.createdAt,
    episodesSlug: c.episodesSlug,
    contexte: c.contexte,
  }
  const body = [
    c.brief ? `## Brief\n\n${c.brief}\n` : '',
    c.phases ? `## Phases\n\n${c.phases}\n` : '',
  ].filter(Boolean).join('\n')

  return matter.stringify(body, frontmatter)
}

// ─── File I/O ─────────────────────────────────────────────────────────────────

export async function readCampaign(slug: string): Promise<Campaign | null> {
  try {
    const raw = await fs.readFile(path.join(CAMPAIGNS_DIR, `${slug}.md`), 'utf-8')
    return parseCampaignFile(raw)
  } catch { return null }
}

export async function writeCampaign(campaign: Campaign): Promise<void> {
  await fs.mkdir(CAMPAIGNS_DIR, { recursive: true })
  await fs.writeFile(
    path.join(CAMPAIGNS_DIR, `${campaign.slug}.md`),
    serializeCampaign(campaign),
    'utf-8'
  )
}

export async function listCampaigns(): Promise<Campaign[]> {
  try {
    const files = (await fs.readdir(CAMPAIGNS_DIR)).filter(f => f.endsWith('.md'))
    const campaigns = await Promise.all(
      files.map(async f => {
        const raw = await fs.readFile(path.join(CAMPAIGNS_DIR, f), 'utf-8')
        return parseCampaignFile(raw)
      })
    )
    return campaigns.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } catch { return [] }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npm test -- parse-campaigns
```

Expected: all tests PASS.

- [ ] **Step 5: Run full test suite to confirm no regressions**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npm test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && git add lib/parse-campaigns.ts lib/parse-campaigns.test.ts && git commit -m "feat(campaigns): add parse-campaigns lib with gray-matter (TDD)"
```

---

## Task 5: generate-campaign.ts

**Files:**
- Create: `dashboard/lib/generate-campaign.ts`

Note: no unit tests for this file (it calls the live Claude API; testing it would require mocking the SDK which adds complexity without value here — the behavior is tested end-to-end via the API route in Task 6).

- [ ] **Step 1: Create `dashboard/lib/generate-campaign.ts`**

```ts
import Anthropic from '@anthropic-ai/sdk'
import type { CampaignGenerateRequest, CampaignGenerateResponse, Format } from './types'

const client = new Anthropic()

const SYSTEM_PROMPT = `Tu es l'agent CMO de Jonathan BRAUN, Responsable Stratégie & Intelligence Artificielle chez Reboot Conseil.

Voix et style :
- Assertif mais humble : "Voici ce que j'observe sur le terrain"
- Direct et structuré : phrases courtes, paragraphes aérés
- Ancré dans le terrain : toujours du concret, des cas vécus
- Longueur idéale post : 800-1300 caractères

Convictions à infuser :
- "La plupart des projets IA échouent par manque de stratégie, pas de technologie"
- "L'IA doit être au service des rêves humains, pas de la productivité aveugle"
- "Entre 'on verra l'année prochaine' et 'projet à 100k€', il y a le POC de 5 jours"

Interdictions absolues :
- Pas d'émojis en début de chaque ligne
- Pas de texte en gras Unicode
- Pas de "C'est avec un immense plaisir que..."
- Pas de "Et vous, qu'en pensez-vous ?" générique
- Maximum 3-4 émojis par post
- Hashtags uniquement en fin de post (3-5 max)`

const FORMAT_INSTRUCTIONS: Record<string, string> = {
  'Post': 'Post LinkedIn classique (800-1300 caractères)',
  'Carrousel': 'Brief textuel pour carrousel LinkedIn (10 slides max, 1 idée par slide)',
  'Article': 'Article long LinkedIn (1500-3000 mots)',
  'Vidéo': 'Script vidéo courte (60-120 secondes, indications de ton et de rythme)',
  'Newsletter': 'Newsletter LinkedIn (500-800 mots, édito + sujet de fond)',
  'Mix': 'Mix de formats (Posts, Carrousels, Vidéos) — choisis le meilleur format pour chaque épisode',
}

export async function generateCampaign(req: CampaignGenerateRequest): Promise<CampaignGenerateResponse> {
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
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  try {
    const parsed = JSON.parse(text) as CampaignGenerateResponse
    // Enforce cap
    parsed.episodes = parsed.episodes.slice(0, maxEpisodes)
    return parsed
  } catch {
    throw new Error(`Claude returned non-JSON response: ${text.slice(0, 300)}`)
  }
}
```

- [ ] **Step 2: Run full test suite to confirm no regressions**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npm test
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && git add lib/generate-campaign.ts && git commit -m "feat(campaigns): add generate-campaign Claude API lib"
```

---

## Task 6: API routes

**Files:**
- Create: `dashboard/app/api/campagnes/route.ts`
- Create: `dashboard/app/api/campagnes/[slug]/route.ts`
- Create: `dashboard/app/api/campagnes/generate/route.ts`

- [ ] **Step 1: Create `dashboard/app/api/campagnes/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { listCampaigns, writeCampaign } from '@/lib/parse-campaigns'
import { slugify } from '@/lib/parse-ideas'
import type { Format, CampaignStatus } from '@/lib/types'

export async function GET() {
  try {
    return NextResponse.json(await listCampaigns())
  } catch { return NextResponse.json([]) }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { titre: string; format: Format | 'Mix'; duree: number }
    if (!body.titre?.trim()) return NextResponse.json({ error: 'titre requis' }, { status: 400 })

    const slug = slugify(body.titre) + '-' + Date.now().toString(36)
    const campaign = {
      slug,
      titre: body.titre.trim(),
      format: body.format ?? 'Post' as Format,
      duree: body.duree ?? 3,
      objectif: '',
      statut: 'draft' as CampaignStatus,
      createdAt: new Date().toISOString().split('T')[0],
      brief: '',
      phases: '',
      episodesSlug: [],
      contexte: '',
    }
    await writeCampaign(campaign)
    return NextResponse.json(campaign, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create `dashboard/app/api/campagnes/[slug]/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { readCampaign, writeCampaign } from '@/lib/parse-campaigns'
import type { Campaign } from '@/lib/types'

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const existing = await readCampaign(slug)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updates = await request.json() as Partial<Campaign>
    // Protect immutable fields
    const { slug: _s, createdAt: _c, ...safeUpdates } = updates
    const updated: Campaign = { ...existing, ...safeUpdates }
    await writeCampaign(updated)
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 3: Create `dashboard/app/api/campagnes/generate/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { readCampaign, writeCampaign } from '@/lib/parse-campaigns'
import { readIdea, writeIdea, slugify } from '@/lib/parse-ideas'
import { generateCampaign } from '@/lib/generate-campaign'
import type { CampaignGenerateRequest, Idea, IdeaStatus, Format } from '@/lib/types'

export async function POST(request: Request) {
  try {
    const body = await request.json() as CampaignGenerateRequest

    if (!body.slug || !body.titre) {
      return NextResponse.json({ error: 'slug et titre requis' }, { status: 400 })
    }

    const existing = await readCampaign(body.slug)
    if (!existing) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    // Generate via Claude
    const generated = await generateCampaign(body)

    // Identify which existing episode slots can be overwritten (non-published)
    const overwritableSlots: string[] = []
    const preservedSlots: string[] = []
    for (const epSlug of existing.episodesSlug) {
      const idea = readIdea(epSlug)
      if (idea && idea.statut === 'published') {
        preservedSlots.push(epSlug)
      } else {
        overwritableSlots.push(epSlug)
      }
    }

    const today = new Date().toISOString().split('T')[0]
    const newEpisodeSlugs: string[] = []
    const ts = Date.now().toString(36)  // compute once — avoids duplicate slugs in tight loop

    // Write episodes: overwrite slots first, then create new files
    for (let i = 0; i < generated.episodes.length; i++) {
      const ep = generated.episodes[i]
      const epSlug = overwritableSlots[i] ?? `${slugify(ep.sujet)}-${ts}-${i.toString(36)}`

      const idea: Idea = {
        slug: epSlug,
        sujet: ep.sujet,
        pilier: ep.pilier,
        format: ep.format as Format,
        statut: 'draft' as IdeaStatus,
        semaine: null,
        jour: null,
        createdAt: today,
        hook: ep.hook,
        texte: ep.texte,
        visuelType: ep.visuelType,
        visuelDescription: ep.visuelDescription,
        hashtags: ep.hashtags,
        campagne: body.slug,
      }
      writeIdea(idea)
      newEpisodeSlugs.push(epSlug)
    }

    // Update campaign file
    const updatedCampaign = {
      ...existing,
      brief: generated.brief,
      phases: generated.phases,
      statut: 'active' as const,
      contexte: body.contexte ?? existing.contexte,
      episodesSlug: [...preservedSlots, ...newEpisodeSlugs],
    }
    await writeCampaign(updatedCampaign)

    return NextResponse.json(updatedCampaign)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run full test suite**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npm test
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && git add app/api/campagnes/ && git commit -m "feat(campaigns): add API routes GET/POST/PATCH/generate"
```

---

## Task 7: CampaignContext

**Files:**
- Create: `dashboard/context/CampaignContext.tsx`

- [ ] **Step 1: Create `dashboard/context/CampaignContext.tsx`**

```tsx
'use client'
import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Campaign } from '@/lib/types'

type CampaignContextValue = {
  campaigns: Campaign[]
  setCampaigns: (campaigns: Campaign[]) => void
  selectedSlug: string | null
  setSelectedSlug: (slug: string | null) => void
}

const CampaignContext = createContext<CampaignContextValue | null>(null)

export function CampaignProvider({ children, initialCampaigns }: { children: ReactNode; initialCampaigns: Campaign[] }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    initialCampaigns[0]?.slug ?? null
  )

  return (
    <CampaignContext.Provider value={{ campaigns, setCampaigns, selectedSlug, setSelectedSlug }}>
      {children}
    </CampaignContext.Provider>
  )
}

export function useCampaigns() {
  const ctx = useContext(CampaignContext)
  if (!ctx) throw new Error('useCampaigns must be used inside CampaignProvider')
  return ctx
}
```

- [ ] **Step 2: Run full test suite**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npm test
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && git add context/CampaignContext.tsx && git commit -m "feat(campaigns): add CampaignContext for client state"
```

---

## Task 8: CampaignList component

**Files:**
- Create: `dashboard/components/CampaignList.tsx`

- [ ] **Step 1: Create `dashboard/components/CampaignList.tsx`**

```tsx
'use client'
import { useState } from 'react'
import type { Campaign, CampaignStatus, Format } from '@/lib/types'
import { useCampaigns } from '@/context/CampaignContext'

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  completed: 'Terminée',
}

const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: '#888',
  active: 'var(--color-primary)',
  completed: '#4caf50',
}

const FORMATS: Array<Format | 'Mix'> = ['Post', 'Carrousel', 'Article', 'Vidéo', 'Newsletter', 'Mix']

export function CampaignList() {
  const { campaigns, setCampaigns, selectedSlug, setSelectedSlug } = useCampaigns()
  const [filter, setFilter] = useState<CampaignStatus | 'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [newTitre, setNewTitre] = useState('')
  const [newFormat, setNewFormat] = useState<Format | 'Mix'>('Post')
  const [newDuree, setNewDuree] = useState(3)
  const [creating, setCreating] = useState(false)

  const visible = filter === 'all' ? campaigns : campaigns.filter(c => c.statut === filter)

  async function handleCreate() {
    if (!newTitre.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/campagnes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titre: newTitre, format: newFormat, duree: newDuree }),
      })
      const created: Campaign = await res.json()
      setCampaigns([created, ...campaigns])
      setSelectedSlug(created.slug)
      setShowForm(false)
      setNewTitre('')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{ width: 280, minWidth: 280, borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Campagnes</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(['all', 'draft', 'active', 'completed'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, border: '1px solid var(--color-border)', background: filter === s ? 'var(--color-primary)' : 'transparent', color: filter === s ? '#fff' : 'var(--color-muted-foreground)', cursor: 'pointer' }}>
              {s === 'all' ? 'Toutes' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {visible.map(c => {
          // Note: idea statuses are not available in the Campaign object (only slugs).
          // The bar shows episode count only — a full published/total ratio would require
          // fetching all ideas client-side, which is out of scope here (YAGNI).
          const total = c.episodesSlug.length
          const pct = total > 0 ? 100 : 0  // placeholder: full bar when episodes exist
          return (
            <div key={c.slug} onClick={() => setSelectedSlug(c.slug)}
              style={{ padding: '10px 12px', marginBottom: 6, borderRadius: 8, cursor: 'pointer', border: `1px solid ${selectedSlug === c.slug ? 'var(--color-primary)' : 'var(--color-border)'}`, background: selectedSlug === c.slug ? 'var(--color-primary-light)' : 'var(--color-surface)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{c.titre}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 10, background: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}>{c.format}</span>
                <span style={{ fontSize: 11, color: STATUS_COLORS[c.statut] }}>{STATUS_LABELS[c.statut]}</span>
                <span style={{ fontSize: 11, color: 'var(--color-muted-foreground)', marginLeft: 'auto' }}>{c.duree} mois</span>
              </div>
              <div style={{ height: 3, borderRadius: 2, background: 'var(--color-border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-primary)', borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--color-muted-foreground)', marginTop: 3 }}>{total} épisodes</div>
            </div>
          )
        })}
        {visible.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--color-muted-foreground)', fontSize: 13, padding: 24 }}>
            Aucune campagne
          </div>
        )}
      </div>

      {/* New campaign form */}
      <div style={{ borderTop: '1px solid var(--color-border)', padding: 12 }}>
        {!showForm ? (
          <button onClick={() => setShowForm(true)}
            style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: '1px dashed var(--color-border)', background: 'transparent', color: 'var(--color-primary)', cursor: 'pointer', fontSize: 13 }}>
            + Nouvelle campagne
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input value={newTitre} onChange={e => setNewTitre(e.target.value)} placeholder="Titre de la campagne"
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13, background: 'var(--color-surface)' }} />
            <select value={newFormat} onChange={e => setNewFormat(e.target.value as Format | 'Mix')}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13, background: 'var(--color-surface)' }}>
              {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <select value={newDuree} onChange={e => setNewDuree(Number(e.target.value))}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13, background: 'var(--color-surface)' }}>
              {[1, 2, 3, 6].map(d => <option key={d} value={d}>{d} mois</option>)}
            </select>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleCreate} disabled={creating || !newTitre.trim()}
                style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: 13, cursor: 'pointer', opacity: creating ? 0.6 : 1 }}>
                {creating ? '...' : 'Créer'}
              </button>
              <button onClick={() => setShowForm(false)}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', fontSize: 13, cursor: 'pointer' }}>
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npm test
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && git add components/CampaignList.tsx && git commit -m "feat(campaigns): add CampaignList component"
```

---

## Task 9: CampaignDetail component

**Files:**
- Create: `dashboard/components/CampaignDetail.tsx`

- [ ] **Step 1: Create `dashboard/components/CampaignDetail.tsx`**

```tsx
'use client'
import { useState } from 'react'
import type { Campaign } from '@/lib/types'
import { useCampaigns } from '@/context/CampaignContext'

export function CampaignDetail() {
  const { campaigns, setCampaigns, selectedSlug } = useCampaigns()
  const campaign = campaigns.find(c => c.slug === selectedSlug) ?? null

  const [editingBrief, setEditingBrief] = useState(false)
  const [briefDraft, setBriefDraft] = useState('')
  const [editingPhases, setEditingPhases] = useState(false)
  const [phasesDraft, setPhasesDraft] = useState('')
  const [saving, setSaving] = useState(false)

  if (!campaign) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted-foreground)', fontSize: 14 }}>
        Sélectionne une campagne
      </div>
    )
  }

  async function saveField(field: 'brief' | 'phases', value: string) {
    if (!campaign) return
    setSaving(true)
    try {
      const res = await fetch(`/api/campagnes/${campaign.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      const updated: Campaign = await res.json()
      setCampaigns(campaigns.map(c => c.slug === updated.slug ? updated : c))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{campaign.titre}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--color-muted-foreground)' }}>
          <span style={{ padding: '2px 8px', borderRadius: 10, background: 'var(--color-border)' }}>{campaign.format}</span>
          <span>{campaign.duree} mois</span>
          <span>·</span>
          <span>{campaign.objectif || 'Objectif non défini'}</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Brief */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Brief stratégique</span>
            <button onClick={() => { setEditingBrief(true); setBriefDraft(campaign.brief) }}
              style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-muted-foreground)' }}>
              Éditer
            </button>
          </div>
          {editingBrief ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <textarea value={briefDraft} onChange={e => setBriefDraft(e.target.value)} rows={5}
                style={{ padding: 10, borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13, resize: 'vertical', background: 'var(--color-surface)' }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={async () => { await saveField('brief', briefDraft); setEditingBrief(false) }} disabled={saving}
                  style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
                  {saving ? '...' : 'Sauvegarder'}
                </button>
                <button onClick={() => setEditingBrief(false)}
                  style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', fontSize: 12, cursor: 'pointer' }}>
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: campaign.brief ? 'inherit' : 'var(--color-muted-foreground)', whiteSpace: 'pre-wrap', margin: 0 }}>
              {campaign.brief || 'Aucun brief généré. Utilise le générateur →'}
            </p>
          )}
        </section>

        {/* Phases */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Phases</span>
            <button onClick={() => { setEditingPhases(true); setPhasesDraft(campaign.phases) }}
              style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-muted-foreground)' }}>
              Éditer
            </button>
          </div>
          {editingPhases ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <textarea value={phasesDraft} onChange={e => setPhasesDraft(e.target.value)} rows={3}
                style={{ padding: 10, borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13, resize: 'vertical', background: 'var(--color-surface)' }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={async () => { await saveField('phases', phasesDraft); setEditingPhases(false) }} disabled={saving}
                  style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
                  {saving ? '...' : 'Sauvegarder'}
                </button>
                <button onClick={() => setEditingPhases(false)}
                  style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', fontSize: 12, cursor: 'pointer' }}>
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: campaign.phases ? 'inherit' : 'var(--color-muted-foreground)', whiteSpace: 'pre-wrap', margin: 0 }}>
              {campaign.phases || 'Aucune phase définie.'}
            </p>
          )}
        </section>

        {/* Episodes */}
        <section>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            Épisodes ({campaign.episodesSlug.length})
          </div>
          {campaign.episodesSlug.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)' }}>Génère la campagne pour créer les épisodes.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {campaign.episodesSlug.map((slug, i) => (
                <div key={slug} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}>
                  <span style={{ color: 'var(--color-muted-foreground)', minWidth: 24 }}>#{i + 1}</span>
                  <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 11 }}>{slug}</span>
                  <a href={`/?idea=${slug}`} style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: 11 }}>→ Backlog</a>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npm test
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && git add components/CampaignDetail.tsx && git commit -m "feat(campaigns): add CampaignDetail component"
```

---

## Task 10: CampaignGenerator component

**Files:**
- Create: `dashboard/components/CampaignGenerator.tsx`

- [ ] **Step 1: Create `dashboard/components/CampaignGenerator.tsx`**

```tsx
'use client'
import { useState, useEffect } from 'react'
import type { Campaign } from '@/lib/types'
import { useCampaigns } from '@/context/CampaignContext'

export function CampaignGenerator() {
  const { campaigns, setCampaigns, selectedSlug } = useCampaigns()
  const campaign = campaigns.find(c => c.slug === selectedSlug) ?? null

  const [audience, setAudience] = useState('')
  const [contraintes, setContraintes] = useState('')
  const [ton, setTon] = useState('')
  const [evenements, setEvenements] = useState('')
  const [objectif, setObjectif] = useState(campaign?.objectif ?? '')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset all fields when the selected campaign changes
  useEffect(() => {
    setObjectif(campaign?.objectif ?? '')
    setAudience('')
    setContraintes('')
    setTon('')
    setEvenements('')
    setError(null)
  }, [selectedSlug])

  if (!campaign) return null

  function buildContexte(): string {
    const parts = [
      audience ? `Audience : ${audience}` : '',
      contraintes ? `Contraintes : ${contraintes}` : '',
      ton ? `Ton : ${ton}` : '',
      evenements ? `Événements à éviter : ${evenements}` : '',
    ].filter(Boolean)
    return parts.join('\n')
  }

  async function handleGenerate() {
    if (!campaign) return
    setGenerating(true)
    setError(null)
    try {
      const contexte = buildContexte()
      const res = await fetch('/api/campagnes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: campaign.slug,
          titre: campaign.titre,
          format: campaign.format,
          duree: campaign.duree,
          objectif: objectif || campaign.objectif,
          contexte,
        }),
      })
      if (!res.ok) {
        const { error: msg } = await res.json()
        throw new Error(msg)
      }
      const updated: Campaign = await res.json()
      setCampaigns(campaigns.map(c => c.slug === updated.slug ? updated : c))
    } catch (e) {
      setError(String(e))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div style={{ width: 360, minWidth: 360, borderLeft: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', padding: 20, gap: 14, overflowY: 'auto' }}>
      <div style={{ fontWeight: 600, fontSize: 14 }}>Générateur</div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>Objectif de la campagne</span>
        <input value={objectif} onChange={e => setObjectif(e.target.value)} placeholder="ex : Positionnement expert + notoriété"
          style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13, background: 'var(--color-surface)' }} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>Audience cible</span>
        <input value={audience} onChange={e => setAudience(e.target.value)} placeholder="ex : dirigeants PME Alsace, secteurs industrie et santé"
          style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13, background: 'var(--color-surface)' }} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>Contraintes</span>
        <input value={contraintes} onChange={e => setContraintes(e.target.value)} placeholder="ex : max 1 vidéo/semaine"
          style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13, background: 'var(--color-surface)' }} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>Ton souhaité</span>
        <input value={ton} onChange={e => setTon(e.target.value)} placeholder="ex : direct et pédagogue, avec humour"
          style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13, background: 'var(--color-surface)' }} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>Événements / thèmes à éviter</span>
        <input value={evenements} onChange={e => setEvenements(e.target.value)} placeholder="ex : élections, sujets politiques"
          style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13, background: 'var(--color-surface)' }} />
      </label>

      {error && (
        <div style={{ fontSize: 12, color: '#e53935', padding: '8px 10px', borderRadius: 6, background: '#fdecea' }}>
          {error}
        </div>
      )}

      <button onClick={handleGenerate} disabled={generating}
        style={{ padding: '10px 0', borderRadius: 8, border: 'none', background: generating ? 'var(--color-border)' : 'var(--color-primary)', color: generating ? 'var(--color-muted-foreground)' : '#fff', fontSize: 14, fontWeight: 600, cursor: generating ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
        {generating ? 'Génération en cours...' : 'Générer la stratégie + tous les épisodes'}
      </button>

      {!generating && campaign.episodesSlug.length > 0 && (
        <a href="/" style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-primary)', textDecoration: 'none' }}>
          → Voir dans le backlog
        </a>
      )}

      <div style={{ fontSize: 11, color: 'var(--color-muted-foreground)', lineHeight: 1.5 }}>
        La génération prend 15-30 secondes. Les épisodes déjà publiés ne seront pas écrasés.
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npm test
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && git add components/CampaignGenerator.tsx && git commit -m "feat(campaigns): add CampaignGenerator component"
```

---

## Task 11: Page + Sidebar

**Files:**
- Create: `dashboard/app/campagnes/page.tsx`
- Modify: `dashboard/components/Sidebar.tsx`

- [ ] **Step 1: Create `dashboard/app/campagnes/page.tsx`**

```tsx
import { listCampaigns } from '@/lib/parse-campaigns'
import { CampaignProvider } from '@/context/CampaignContext'
import { Sidebar } from '@/components/Sidebar'
import { CampaignList } from '@/components/CampaignList'
import { CampaignDetail } from '@/components/CampaignDetail'
import { CampaignGenerator } from '@/components/CampaignGenerator'

export default async function CampagnesPage() {
  const campaigns = await listCampaigns()

  return (
    <CampaignProvider initialCampaigns={campaigns}>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <CampaignList />
          <CampaignDetail />
          <CampaignGenerator />
        </div>
      </div>
    </CampaignProvider>
  )
}
```

- [ ] **Step 2: Add Campagnes entry to Sidebar**

In `dashboard/components/Sidebar.tsx`, update the `NAV` array:

```ts
const NAV = [
  { href: '/', label: 'Planification', icon: '⊞' },
  { href: '/campagnes', label: 'Campagnes', icon: '◈' },
  { href: '/performances', label: 'Performances', icon: '↑' },
]
```

- [ ] **Step 3: Run full test suite**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npm test
```

Expected: all tests PASS.

- [ ] **Step 4: Verify build**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npm run build
```

Expected: build succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && git add app/campagnes/ components/Sidebar.tsx && git commit -m "feat(campaigns): add /campagnes page and sidebar entry — feature complete"
```

---

## Final smoke test

After all tasks complete, manually verify in the browser (`http://localhost:3001`):

1. "Campagnes" appears in sidebar and navigates to `/campagnes`
2. "Nouvelle campagne" form creates a card in the left column
3. Selecting a campaign shows the detail panel (empty brief/phases initially)
4. Filling the generator form and clicking "Générer" triggers a ~20s spinner, then populates brief, phases, and episodes list
5. Navigating to the main backlog shows the generated ideas tagged with the campaign
