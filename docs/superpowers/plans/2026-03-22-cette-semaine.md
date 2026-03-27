# "Cette Semaine" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the home page with a "Cette semaine" weekly intelligence hub that synthesises active campaigns, a voice note, and web-searched AI trends into a proposed weekly post plan — keeping existing calendar/backlog accessible at `/calendrier`.

**Architecture:** Three input streams (campaigns, voice note text, web veille) are sent to a new `/api/cette-semaine/generate` route that calls Claude with a structured prompt and returns a `WeeklyPlan`. A second route `/api/cette-semaine/veille` fetches 5 trend items via Claude's built-in `web_search_20250305` tool. The page is fully client-side interactive (paste note → fetch veille → generate plan → validate posts to calendar).

**Tech Stack:** Next.js 15 App Router, React 19, Anthropic SDK (`web_search_20250305` tool + `claude-sonnet-4-6`), Vitest, existing `lib/parse-campaigns`, `lib/parse-ideas`, `lib/calendar-sync`.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `lib/types.ts` | Add `VeilleItem`, `WeeklyPost`, `WeeklyPlan` types |
| Create | `lib/generate-veille.ts` | Call Claude web_search → return 5 `VeilleItem` |
| Create | `lib/generate-veille.test.ts` | Unit tests for veille parsing |
| Create | `lib/generate-weekly-plan.ts` | Call Claude with 3 inputs → return `WeeklyPlan` |
| Create | `lib/generate-weekly-plan.test.ts` | Unit tests for plan parsing |
| Create | `app/api/cette-semaine/veille/route.ts` | POST → runs veille generation |
| Create | `app/api/cette-semaine/generate/route.ts` | POST → runs weekly plan generation |
| Create | `app/api/cette-semaine/validate/route.ts` | POST → schedules idea or creates draft (separate from `[slug]` route) |
| Create | `app/calendrier/page.tsx` | Current home (CalendarGrid + BacklogPanel) moved here |
| Modify | `app/page.tsx` | Replaced with "Cette semaine" page |
| Create | `components/NoteVocalePanel.tsx` | Textarea + submit for voice note |
| Create | `components/VeillePanel.tsx` | Fetch button + display 5 trend items |
| Create | `components/WeeklyPlanPanel.tsx` | Display proposed posts + validate buttons |
| Modify | `components/Sidebar.tsx` | Add "Cette semaine" as first nav item, rename "Planification" → "Calendrier" with `/calendrier` href |

---

## Task 1: Add new types to `lib/types.ts`

**Files:**
- Modify: `dashboard/lib/types.ts`

- [ ] **Step 1: Add types** — append to end of `lib/types.ts`:

```typescript
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

export type VeilleGenerateRequest = {
  // no body — topics are derived from Jonathan's editorial identity
}

export type VeilleGenerateResponse = {
  items: VeilleItem[]
}

export type WeeklyPlanRequest = {
  noteVocale: string           // raw text from voice note (may be empty string)
  veille: VeilleItem[]         // 0-5 items, may be empty
  activeCampaigns: Array<{     // loaded server-side but sent from client for simplicity
    slug: string
    titre: string
    nextEpisodeSujet?: string  // sujet of the first non-published episode
    nextEpisodeSlug?: string
    pilier?: string
  }>
  budgetPosts: number          // 3 standard, 4-5 if exceptional topics found
}

export type WeeklyPlanResponse = {
  plan: WeeklyPlan
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx tsc --noEmit
```
Expected: no errors related to `types.ts`

- [ ] **Step 3: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent && git add dashboard/lib/types.ts && git commit -m "feat(types): add VeilleItem, WeeklyPost, WeeklyPlan types"
```

---

## Task 2: Move calendar home to `/calendrier`

**Files:**
- Create: `dashboard/app/calendrier/page.tsx`
- Modify: `dashboard/components/Sidebar.tsx`

- [ ] **Step 1: Create `/calendrier/page.tsx`** — exact copy of current `app/page.tsx`:

```tsx
import { listIdeas } from '@/lib/parse-ideas'
import { IdeaProvider } from '@/context/IdeaContext'
import { Sidebar } from '@/components/Sidebar'
import { BacklogPanel } from '@/components/BacklogPanel'
import { CalendarGrid } from '@/components/CalendarGrid'
import { DetailPanel } from '@/components/DetailPanel'

export default function CalendrierPage() {
  const ideas = listIdeas()

  return (
    <IdeaProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <BacklogPanel ideas={ideas} />
          <CalendarGrid ideas={ideas} />
          <DetailPanel allIdeas={ideas} />
        </div>
      </div>
    </IdeaProvider>
  )
}
```

- [ ] **Step 2: Update Sidebar nav** — replace the `NAV` array in `components/Sidebar.tsx`:

```typescript
const NAV = [
  { href: '/', label: 'Cette semaine', icon: '◎' },
  { href: '/campagnes', label: 'Campagnes', icon: '◈' },
  { href: '/strategie', label: 'Stratégie', icon: '⊕' },
  { href: '/calendrier', label: 'Calendrier', icon: '⊞' },
  { href: '/performances', label: 'Performances', icon: '↑' },
]
```

- [ ] **Step 3: Verify `/calendrier` renders correctly** — start dev server and open http://localhost:3001/calendrier, confirm it shows the calendar grid and backlog.

- [ ] **Step 4: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent && git add dashboard/app/calendrier/page.tsx dashboard/components/Sidebar.tsx && git commit -m "feat(nav): add /calendrier route, update sidebar navigation"
```

---

## Task 3: Veille generation lib + API

**Files:**
- Create: `dashboard/lib/generate-veille.ts`
- Create: `dashboard/lib/generate-veille.test.ts`
- Create: `dashboard/app/api/cette-semaine/veille/route.ts`

- [ ] **Step 1: Write failing test** in `dashboard/lib/generate-veille.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseVeilleResponse } from './generate-veille'

describe('parseVeilleResponse', () => {
  it('parses a valid JSON array of 5 items', () => {
    const raw = JSON.stringify([
      {
        titre: 'OpenAI lance GPT-5',
        resume: 'OpenAI a annoncé GPT-5 cette semaine.',
        source: 'TechCrunch',
        pilier: 'IA & Transformation',
        urgence: 'haute',
        angleJonathan: "Ce que ça change concrètement pour une PME qui démarre l'IA"
      }
    ])
    const result = parseVeilleResponse(raw)
    expect(result).toHaveLength(1)
    expect(result[0].titre).toBe('OpenAI lance GPT-5')
    expect(result[0].urgence).toBe('haute')
  })

  it('handles JSON wrapped in markdown fences', () => {
    const raw = '```json\n[{"titre":"T","resume":"R","source":"S","pilier":"P","urgence":"basse","angleJonathan":"A"}]\n```'
    const result = parseVeilleResponse(raw)
    expect(result).toHaveLength(1)
  })

  it('returns empty array on unparseable response', () => {
    const result = parseVeilleResponse('not json at all')
    expect(result).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx vitest run lib/generate-veille.test.ts
```
Expected: FAIL — `parseVeilleResponse` not found

- [ ] **Step 3: Implement `lib/generate-veille.ts`**:

```typescript
import Anthropic from '@anthropic-ai/sdk'
import type { VeilleItem } from './types'
import { CMO_SYSTEM_PROMPT } from './prompts'

const client = new Anthropic()

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

export async function generateVeille(): Promise<VeilleItem[]> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: CMO_SYSTEM_PROMPT,
    tools: [{ type: 'web_search_20250305' as const, name: 'web_search' }],
    messages: [{ role: 'user', content: VEILLE_PROMPT }],
  })

  // Extract the final text block (after tool use)
  const textBlock = [...response.content].reverse().find(b => b.type === 'text')
  const raw = textBlock?.type === 'text' ? textBlock.text : ''
  return parseVeilleResponse(raw)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx vitest run lib/generate-veille.test.ts
```
Expected: 3 tests PASS

- [ ] **Step 5: Create API route** `app/api/cette-semaine/veille/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { generateVeille } from '@/lib/generate-veille'

export async function POST() {
  try {
    const items = await generateVeille()
    return NextResponse.json({ items })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 6: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent && git add dashboard/lib/generate-veille.ts dashboard/lib/generate-veille.test.ts dashboard/app/api/cette-semaine/veille/route.ts && git commit -m "feat(veille): generate 5 trend items via Claude web search"
```

---

## Task 4: Weekly plan generation lib + API

**Files:**
- Create: `dashboard/lib/generate-weekly-plan.ts`
- Create: `dashboard/lib/generate-weekly-plan.test.ts`
- Create: `dashboard/app/api/cette-semaine/generate/route.ts`

- [ ] **Step 1: Write failing test** in `dashboard/lib/generate-weekly-plan.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseWeeklyPlanResponse } from './generate-weekly-plan'

describe('parseWeeklyPlanResponse', () => {
  it('parses a valid WeeklyPlan JSON', () => {
    const plan = {
      semaine: 12,
      dateDebut: '2026-03-23',
      posts: [
        {
          type: 'campagne',
          jour: 'Mar',
          sujet: 'Pourquoi les projets IA échouent',
          hook: 'On a tout raté. Et c'était prévisible.',
          justification: 'Épisode 1 de la campagne Stratégie avant techno, pilier fort cette semaine.',
          sourceLabel: 'Campagne: Stratégie avant techno — Ép. 1',
          campagneSlug: 'la-strategie-avant-la-technologie',
          urgence: 'normale'
        }
      ],
      generatedAt: '2026-03-22T10:00:00Z'
    }
    const result = parseWeeklyPlanResponse(JSON.stringify(plan))
    expect(result.posts).toHaveLength(1)
    expect(result.posts[0].type).toBe('campagne')
    expect(result.posts[0].jour).toBe('Mar')
  })

  it('handles JSON wrapped in markdown fences', () => {
    const plan = { semaine: 1, dateDebut: '2026-01-06', posts: [], generatedAt: '' }
    const raw = '```json\n' + JSON.stringify(plan) + '\n```'
    const result = parseWeeklyPlanResponse(raw)
    expect(result.posts).toEqual([])
  })

  it('throws on unparseable response', () => {
    expect(() => parseWeeklyPlanResponse('not json')).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx vitest run lib/generate-weekly-plan.test.ts
```
Expected: FAIL — `parseWeeklyPlanResponse` not found

- [ ] **Step 3: Implement `lib/generate-weekly-plan.ts`**:

```typescript
import Anthropic from '@anthropic-ai/sdk'
import type { WeeklyPlan, WeeklyPlanRequest } from './types'
import { CMO_SYSTEM_PROMPT } from './prompts'

const client = new Anthropic()

export function parseWeeklyPlanResponse(raw: string): WeeklyPlan {
  const text = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`No JSON object found in response: ${raw.slice(0, 200)}`)
  return JSON.parse(match[0]) as WeeklyPlan
}

export async function generateWeeklyPlan(req: WeeklyPlanRequest): Promise<WeeklyPlan> {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() + (1 - today.getDay() + 7) % 7)
  const dateDebut = monday.toISOString().split('T')[0]
  const semaine = Math.ceil((monday.getTime() - new Date(monday.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))

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
      "campagneSlug": "slug-campagne-si-type-campagne",
      "ideaSlug": "slug-idea-si-episode-existant",
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
  return parseWeeklyPlanResponse(raw)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx vitest run lib/generate-weekly-plan.test.ts
```
Expected: 3 tests PASS

- [ ] **Step 5: Create API route** `app/api/cette-semaine/generate/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { listCampaigns } from '@/lib/parse-campaigns'
import { readIdea } from '@/lib/parse-ideas'
import { generateWeeklyPlan } from '@/lib/generate-weekly-plan'
import type { WeeklyPlanRequest } from '@/lib/types'

export async function POST(request: Request) {
  try {
    const body = await request.json() as Pick<WeeklyPlanRequest, 'noteVocale' | 'veille'>

    // Load active campaigns server-side
    const allCampaigns = await listCampaigns()
    const activeCampaigns = allCampaigns
      .filter(c => c.statut === 'active')
      .map(c => {
        const nextEp = c.episodesSlug
          .map(slug => readIdea(slug))
          .find(idea => idea && idea.statut !== 'published')
        return {
          slug: c.slug,
          titre: c.titre,
          nextEpisodeSujet: nextEp?.sujet,
          nextEpisodeSlug: nextEp?.slug,
          pilier: nextEp?.pilier,
        }
      })

    // Determine post budget (4+ if any veille item is urgence haute)
    const hasHotTopic = body.veille.some(v => v.urgence === 'haute')
    const budgetPosts = hasHotTopic ? 4 : 3

    const plan = await generateWeeklyPlan({
      noteVocale: body.noteVocale ?? '',
      veille: body.veille ?? [],
      activeCampaigns,
      budgetPosts,
    })

    return NextResponse.json({ plan })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 7: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent && git add dashboard/lib/generate-weekly-plan.ts dashboard/lib/generate-weekly-plan.test.ts dashboard/app/api/cette-semaine/generate/route.ts && git commit -m "feat(weekly-plan): generate weekly post plan from 3 input streams"
```

---

## Task 5: UI Components

**Files:**
- Create: `dashboard/components/NoteVocalePanel.tsx`
- Create: `dashboard/components/VeillePanel.tsx`
- Create: `dashboard/components/WeeklyPlanPanel.tsx`

- [ ] **Step 1: Create `NoteVocalePanel.tsx`**:

```tsx
'use client'

interface Props {
  value: string
  onChange: (v: string) => void
}

export function NoteVocalePanel({ value, onChange }: Props) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Ta note de la semaine
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Dicte sur ton téléphone, colle le texte ici. Ce qui s'est passé cette semaine : un client marquant, un insight terrain, une résistance observée, une victoire rapide..."
        rows={6}
        style={{
          width: '100%',
          padding: '10px 12px',
          fontSize: 13,
          lineHeight: 1.6,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 6,
          color: 'var(--color-foreground)',
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create `VeillePanel.tsx`**:

```tsx
'use client'
import { useState } from 'react'
import type { VeilleItem } from '@/lib/types'

interface Props {
  items: VeilleItem[]
  loading: boolean
  onFetch: () => void
}

const URGENCE_COLOR: Record<string, string> = {
  haute: '#ef4444',
  moyenne: '#f59e0b',
  basse: 'var(--color-muted-foreground)',
}

export function VeillePanel({ items, loading, onFetch }: Props) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Veille IA — 5 sujets
        </div>
        <button
          onClick={onFetch}
          disabled={loading}
          style={{
            fontSize: 12, padding: '4px 10px', borderRadius: 4,
            background: 'var(--color-primary)', color: '#fff',
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Recherche...' : 'Rechercher'}
        </button>
      </div>

      {items.length === 0 && !loading && (
        <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)', padding: '12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6 }}>
          Lance la recherche pour obtenir les 5 sujets tendance de la semaine.
        </div>
      )}

      {items.map((item, i) => (
        <div key={i} style={{ padding: '10px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: URGENCE_COLOR[item.urgence], textTransform: 'uppercase', marginTop: 1 }}>
              {item.urgence}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-foreground)', lineHeight: 1.4 }}>{item.titre}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)', marginBottom: 4 }}>{item.resume}</div>
          <div style={{ fontSize: 11, color: 'var(--color-primary)', fontStyle: 'italic' }}>{item.angleJonathan}</div>
          <div style={{ fontSize: 11, color: 'var(--color-muted-foreground)', marginTop: 4 }}>
            {item.pilier} · {item.source}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create `WeeklyPlanPanel.tsx`**:

```tsx
'use client'
import type { WeeklyPlan, WeeklyPost } from '@/lib/types'

interface Props {
  plan: WeeklyPlan | null
  loading: boolean
  onGenerate: () => void
  onValidate: (post: WeeklyPost) => void
}

const TYPE_LABEL: Record<string, string> = {
  campagne: 'Campagne',
  reactif: 'Réactif',
  terrain: 'Terrain',
  evergreen: 'Evergreen',
}

const TYPE_COLOR: Record<string, string> = {
  campagne: 'var(--color-primary)',
  reactif: '#ef4444',
  terrain: '#10b981',
  evergreen: '#8b5cf6',
}

const URGENCE_BORDER: Record<string, string> = {
  haute: '2px solid #ef4444',
  normale: '1px solid var(--color-border)',
}

export function WeeklyPlanPanel({ plan, loading, onGenerate, onValidate }: Props) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-foreground)' }}>
          {plan ? `Plan — semaine ${plan.semaine}` : 'Plan de la semaine'}
        </div>
        <button
          onClick={onGenerate}
          disabled={loading}
          style={{
            fontSize: 13, padding: '6px 14px', borderRadius: 6,
            background: 'var(--color-primary)', color: '#fff',
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 600, opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Génération...' : plan ? 'Regénérer' : 'Générer le plan'}
        </button>
      </div>

      {!plan && !loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted-foreground)', fontSize: 13, textAlign: 'center', padding: 32 }}>
          Ajoute ta note de la semaine, lance la veille (optionnel),<br />puis génère le plan.
        </div>
      )}

      {plan && plan.posts.map((post, i) => (
        <div key={i} style={{
          padding: '14px 16px',
          background: 'var(--color-surface)',
          border: URGENCE_BORDER[post.urgence],
          borderRadius: 8,
          marginBottom: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 3, background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
              {post.jour}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: TYPE_COLOR[post.type] }}>
              {TYPE_LABEL[post.type]}
            </span>
            {post.urgence === 'haute' && (
              <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>● URGENT</span>
            )}
            <span style={{ fontSize: 11, color: 'var(--color-muted-foreground)', marginLeft: 'auto' }}>
              {post.sourceLabel}
            </span>
          </div>

          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-foreground)', marginBottom: 4 }}>
            {post.sujet}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)', fontStyle: 'italic', marginBottom: 6, lineHeight: 1.5 }}>
            "{post.hook}"
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)', marginBottom: 10, lineHeight: 1.5 }}>
            {post.justification}
          </div>

          <button
            onClick={() => onValidate(post)}
            style={{
              fontSize: 12, padding: '4px 10px', borderRadius: 4,
              background: 'transparent', color: 'var(--color-primary)',
              border: '1px solid var(--color-primary)', cursor: 'pointer',
            }}
          >
            Valider → Calendrier
          </button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent && git add dashboard/components/NoteVocalePanel.tsx dashboard/components/VeillePanel.tsx dashboard/components/WeeklyPlanPanel.tsx && git commit -m "feat(components): add NoteVocalePanel, VeillePanel, WeeklyPlanPanel"
```

---

## Task 6: Assemble "Cette semaine" home page + validate action

**Files:**
- Modify: `dashboard/app/page.tsx`

- [ ] **Step 1: Replace `app/page.tsx` with the Cette semaine page**:

```tsx
'use client'
import { useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { NoteVocalePanel } from '@/components/NoteVocalePanel'
import { VeillePanel } from '@/components/VeillePanel'
import { WeeklyPlanPanel } from '@/components/WeeklyPlanPanel'
import type { VeilleItem, WeeklyPlan, WeeklyPost } from '@/lib/types'

export default function CetteSemainePage() {
  const [noteVocale, setNoteVocale] = useState('')
  const [veille, setVeille] = useState<VeilleItem[]>([])
  const [veilleLoading, setVeilleLoading] = useState(false)
  const [plan, setPlan] = useState<WeeklyPlan | null>(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [validated, setValidated] = useState<Set<number>>(new Set())

  async function handleFetchVeille() {
    setVeilleLoading(true)
    try {
      const res = await fetch('/api/cette-semaine/veille', { method: 'POST' })
      const data = await res.json() as { items: VeilleItem[] }
      setVeille(data.items ?? [])
    } catch (e) {
      console.error('Veille error:', e)
    } finally {
      setVeilleLoading(false)
    }
  }

  async function handleGeneratePlan() {
    setPlanLoading(true)
    try {
      const res = await fetch('/api/cette-semaine/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteVocale, veille }),
      })
      const data = await res.json() as { plan: WeeklyPlan }
      setPlan(data.plan ?? null)
      setValidated(new Set())
    } catch (e) {
      console.error('Plan error:', e)
    } finally {
      setPlanLoading(false)
    }
  }

  async function handleValidate(post: WeeklyPost, index: number) {
    try {
      await fetch('/api/cette-semaine/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sujet: post.sujet,
          pilier: post.pilier,
          format: 'Post',
          hook: post.hook,
          campagneSlug: post.campagneSlug,
          ideaSlug: post.ideaSlug,
          jour: post.jour,
          semaine: plan?.semaine,
          sourceLabel: post.sourceLabel,
        }),
      })
      setValidated(prev => new Set([...prev, index]))
    } catch (e) {
      console.error('Validate error:', e)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT — Inputs */}
        <div style={{
          width: 340, minWidth: 340,
          borderRight: '1px solid var(--color-border)',
          padding: '20px 16px',
          overflowY: 'auto',
          background: 'var(--color-surface)',
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-foreground)', marginBottom: 20 }}>
            Cette semaine
          </div>

          <NoteVocalePanel value={noteVocale} onChange={setNoteVocale} />
          <VeillePanel items={veille} loading={veilleLoading} onFetch={handleFetchVeille} />
        </div>

        {/* RIGHT — Weekly plan */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
          <WeeklyPlanPanel
            plan={plan}
            loading={planLoading}
            onGenerate={handleGeneratePlan}
            onValidate={(post) => {
              const index = plan!.posts.indexOf(post)
              handleValidate(post, index)
            }}
          />
        </div>

      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create validate API route** `app/api/cette-semaine/validate/route.ts` — assigns an existing idea to calendar OR creates a minimal draft idea. Note: placed under `/cette-semaine/` to avoid conflict with the `app/api/ideas/[slug]` dynamic route. New reactive/terrain posts are created with `statut: 'scheduled'` and empty `texte` — this is intentional; content is generated later via the existing `/api/generate` endpoint.

```typescript
import { NextResponse } from 'next/server'
import { readIdea, writeIdea, slugify } from '@/lib/parse-ideas'
import type { Idea, Format, Jour } from '@/lib/types'

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      sujet: string
      pilier?: string
      format?: Format
      hook?: string
      campagneSlug?: string
      ideaSlug?: string
      jour?: Jour
      semaine?: number
      sourceLabel?: string
    }

    if (body.ideaSlug) {
      // Update existing idea with scheduling
      const existing = readIdea(body.ideaSlug)
      if (!existing) return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
      const updated: Idea = { ...existing, jour: body.jour ?? null, semaine: body.semaine ?? null, statut: 'scheduled' }
      writeIdea(updated)
      return NextResponse.json(updated)
    }

    // Create new draft idea from reactive/terrain/evergreen post
    const ts = Date.now().toString(36)
    const slug = `${slugify(body.sujet)}-${ts}`
    const today = new Date().toISOString().split('T')[0]
    const idea: Idea = {
      slug,
      sujet: body.sujet,
      pilier: body.pilier ?? 'IA & Transformation',
      format: body.format ?? 'Post',
      statut: 'scheduled',
      semaine: body.semaine ?? null,
      jour: body.jour ?? null,
      createdAt: today,
      hook: body.hook ?? '',
      texte: '',
      visuelType: 'Photo authentique',
      visuelDescription: '',
      hashtags: [],
      campagne: body.campagneSlug,
    }
    writeIdea(idea)
    return NextResponse.json(idea)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 5: Run all tests**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx vitest run
```
Expected: all tests pass

- [ ] **Step 6: Manual smoke test** — open http://localhost:3001, verify:
  - "Cette semaine" page loads with left/right layout
  - Paste text in note field → text persists
  - Click "Rechercher" → spinner appears → 5 veille items appear
  - Click "Générer le plan" → spinner → 3-4 post cards appear with jour/type badges
  - Navigate to http://localhost:3001/calendrier → original grid/backlog loads
  - Sidebar shows: Cette semaine / Campagnes / Stratégie / Calendrier / Performances

- [ ] **Step 7: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent && git add dashboard/app/page.tsx dashboard/app/api/cette-semaine/validate/route.ts && git commit -m "feat(cette-semaine): assemble weekly intelligence home page"
```

---

## Summary

After all tasks complete, the dashboard has:

1. **`/` (Cette semaine)** — weekly intelligence hub with voice note input, web veille, and AI-generated weekly plan
2. **`/calendrier`** — original grid + backlog (unchanged functionality)
3. **`/campagnes`** — unchanged
4. **`/strategie`** — unchanged
5. **Sidebar** — "Cette semaine" is first item, "Calendrier" replaces "Planification"
6. **Validate action** — schedules an existing episode OR creates a new draft idea from a reactive/terrain post
