# Strategy Engine Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a proactive AI strategy page (`/strategie`) where Jonathan specifies a number of weeks, Claude reads CLAUDE.md + history and proposes N campaigns (Bloc 1), Jonathan selects/deselects, then the client generates all campaigns sequentially (Bloc 2).

**Architecture:** Bloc 1 is a server-side Claude call (`POST /api/strategy/generate-plan`) that reads CLAUDE.md, generation log (last 5 entries), and ideas backlog to return `ProposedCampaign[]`. Bloc 2 is purely client-side, calling the existing `/api/campagnes` + `/api/campagnes/generate` routes sequentially per selected campaign. A generation log in `content/strategy/generation-log.md` tracks history to avoid repetition.

**Tech Stack:** Next.js 14 App Router, TypeScript, Anthropic SDK (`claude-sonnet-4-6`), Vitest, filesystem-based storage (no DB).

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `dashboard/lib/types.ts` | Add `ProposedCampaign`, `GeneratePlanRequest`, `GeneratePlanResponse`, `GenerationEntry` |
| Create | `dashboard/lib/prompts.ts` | Single `CMO_SYSTEM_PROMPT` export — eliminates duplication |
| Modify | `dashboard/lib/generate.ts` | Import `CMO_SYSTEM_PROMPT` from `./prompts`, remove local copy |
| Modify | `dashboard/lib/generate-campaign.ts` | Import `CMO_SYSTEM_PROMPT` from `./prompts`, remove local copy |
| Create | `dashboard/lib/generation-log.ts` | `readGenerationLog()` (last 5 entries) + `appendGenerationEntry()` |
| Create | `dashboard/lib/generation-log.test.ts` | Unit tests for log parsing and serialization |
| Create | `dashboard/lib/generate-strategy.ts` | `readIdeasSummary()` + `generateStrategyPlan()` (Claude call) |
| Create | `dashboard/app/api/strategy/generate-plan/route.ts` | `POST` — calls `generateStrategyPlan`, returns `ProposedCampaign[]` |
| Create | `dashboard/app/api/strategy/update-log/route.ts` | `POST` — calls `appendGenerationEntry` |
| Create | `content/strategy/generation-log.md` | Initial log file (empty state) |
| Modify | `dashboard/components/Sidebar.tsx` | Add "Stratégie" entry to NAV array |
| Create | `dashboard/components/StrategyPlanner.tsx` | Client component — full 3-step UI |
| Create | `dashboard/app/strategie/page.tsx` | Server page — renders `Sidebar` + `StrategyPlanner` |

---

## Task 1: Add types

**Files:**
- Modify: `dashboard/lib/types.ts`

- [ ] **Step 1: Add the four new types at the end of `types.ts`**

```ts
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/jonathanbraun/cmo-agent/dashboard && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git -C /Users/jonathanbraun/cmo-agent add dashboard/lib/types.ts
git -C /Users/jonathanbraun/cmo-agent commit -m "feat(strategy): add ProposedCampaign, GeneratePlanRequest, GeneratePlanResponse, GenerationEntry types"
```

---

## Task 2: Extract shared SYSTEM_PROMPT to `lib/prompts.ts`

**Files:**
- Create: `dashboard/lib/prompts.ts`
- Modify: `dashboard/lib/generate.ts`
- Modify: `dashboard/lib/generate-campaign.ts`

- [ ] **Step 1: Create `dashboard/lib/prompts.ts`**

```ts
export const CMO_SYSTEM_PROMPT = `Tu es l'agent CMO de Jonathan BRAUN, Responsable Stratégie & Intelligence Artificielle chez Reboot Conseil.

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
```

- [ ] **Step 2: Update `dashboard/lib/generate.ts`**

Replace the local `const SYSTEM_PROMPT = ...` block (lines 6–25) with:
```ts
import { CMO_SYSTEM_PROMPT } from './prompts'
```
Then replace all occurrences of `SYSTEM_PROMPT` in this file with `CMO_SYSTEM_PROMPT`.

- [ ] **Step 3: Update `dashboard/lib/generate-campaign.ts`**

Same as Step 2: remove local `const SYSTEM_PROMPT = ...` block (lines 6–25), add import, replace usages.

- [ ] **Step 4: Run existing tests to confirm no regression**

Run: `cd /Users/jonathanbraun/cmo-agent/dashboard && npm test`
Expected: all tests pass (same count as before)

- [ ] **Step 5: TypeScript check**

Run: `cd /Users/jonathanbraun/cmo-agent/dashboard && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git -C /Users/jonathanbraun/cmo-agent add dashboard/lib/prompts.ts dashboard/lib/generate.ts dashboard/lib/generate-campaign.ts
git -C /Users/jonathanbraun/cmo-agent commit -m "refactor: extract CMO_SYSTEM_PROMPT to lib/prompts.ts, remove duplication"
```

---

## Task 3: Create `lib/generation-log.ts` with tests

**Files:**
- Create: `dashboard/lib/generation-log.ts`
- Create: `dashboard/lib/generation-log.test.ts`

The log file format is markdown with YAML frontmatter for metadata. `readGenerationLog()` returns the last 5 `###` entries as a string (to cap prompt size). `appendGenerationEntry()` appends a new entry and increments the frontmatter counters.

- [ ] **Step 1: Write the failing tests**

Create `dashboard/lib/generation-log.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseLogEntries, serializeLogEntry, truncateToLastN } from './generation-log'
import type { GenerationEntry } from './types'

const SAMPLE_LOG = `---
lastGeneration: 2026-03-01
totalPostsGenerated: 36
---

## Générations

### 2026-03-01 — Plan 12 semaines

- Campagnes créées : 4
- Posts générés : 36
- Piliers couverts : IA & Transformation (12), Stratégie & Décision (8), Business & ROI (8), Coulisses & Authenticité (8)
- Sujets principaux : POC IA, Résistance au changement, ROI formation IA, Coulisses Reboot

### 2026-03-10 — Plan 4 semaines

- Campagnes créées : 1
- Posts générés : 8
- Piliers couverts : Innovation & Prospective (8)
- Sujets principaux : Tendances IA 2026
`

const ENTRY: GenerationEntry = {
  date: '2026-03-18',
  semaines: 8,
  campaigns: [
    { titre: 'POC en 5 jours', pilier: 'Business & ROI', episodesCount: 6 },
    { titre: 'IA et RH', pilier: 'IA & Transformation', episodesCount: 4 },
  ],
}

describe('parseLogEntries', () => {
  it('returns array of entry text blocks', () => {
    const entries = parseLogEntries(SAMPLE_LOG)
    expect(entries).toHaveLength(2)
    expect(entries[0]).toContain('2026-03-01')
    expect(entries[1]).toContain('2026-03-10')
  })

  it('returns empty array for log with no entries', () => {
    const entries = parseLogEntries('---\nlastGeneration: \ntotalPostsGenerated: 0\n---\n\n## Générations\n')
    expect(entries).toHaveLength(0)
  })
})

describe('truncateToLastN', () => {
  it('returns last N entries', () => {
    const entries = parseLogEntries(SAMPLE_LOG)
    const truncated = truncateToLastN(entries, 1)
    expect(truncated).toHaveLength(1)
    expect(truncated[0]).toContain('2026-03-10')
  })

  it('returns all entries when fewer than N exist', () => {
    const entries = parseLogEntries(SAMPLE_LOG)
    const truncated = truncateToLastN(entries, 10)
    expect(truncated).toHaveLength(2)
  })
})

describe('serializeLogEntry', () => {
  it('produces a formatted markdown entry', () => {
    const text = serializeLogEntry(ENTRY)
    expect(text).toContain('### 2026-03-18 — Plan 8 semaines')
    expect(text).toContain('Campagnes créées : 2')
    expect(text).toContain('Posts générés : 10')
    expect(text).toContain('POC en 5 jours')
    expect(text).toContain('IA et RH')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `cd /Users/jonathanbraun/cmo-agent/dashboard && npm test -- generation-log`
Expected: FAIL — `parseLogEntries`, `serializeLogEntry`, `truncateToLastN` not found

- [ ] **Step 3: Implement `dashboard/lib/generation-log.ts`**

```ts
import fs from 'fs'
import path from 'path'
import type { GenerationEntry } from './types'

const CMO_BASE = process.env.CMO_BASE ?? '/Users/jonathanbraun/cmo-agent'
const LOG_PATH = path.join(CMO_BASE, 'content/strategy/generation-log.md')

// ─── Pure helpers (exported for tests) ────────────────────────────────────────

export function parseLogEntries(content: string): string[] {
  const sections = content.split(/(?=^### )/m)
  return sections.filter(s => s.startsWith('### ')).map(s => s.trim())
}

export function truncateToLastN(entries: string[], n: number): string[] {
  return entries.slice(-n)
}

export function serializeLogEntry(entry: GenerationEntry): string {
  const totalPosts = entry.campaigns.reduce((sum, c) => sum + c.episodesCount, 0)
  const campaignLines = entry.campaigns
    .map(c => `  - ${c.titre} [${c.pilier}] — ${c.episodesCount} épisodes`)
    .join('\n')
  return `### ${entry.date} — Plan ${entry.semaines} semaines

- Campagnes créées : ${entry.campaigns.length}
- Posts générés : ${totalPosts}
- Sujets principaux :
${campaignLines}`
}

// ─── Filesystem IO ─────────────────────────────────────────────────────────────

export async function readGenerationLog(): Promise<string> {
  try {
    const content = fs.readFileSync(LOG_PATH, 'utf-8')
    const entries = parseLogEntries(content)
    const last5 = truncateToLastN(entries, 5)
    if (last5.length === 0) return 'Aucune génération précédente.'
    return `Dernières générations (${last5.length}) :\n\n${last5.join('\n\n')}`
  } catch {
    return 'Aucune génération précédente.'
  }
}

export async function appendGenerationEntry(entry: GenerationEntry): Promise<void> {
  const totalPosts = entry.campaigns.reduce((sum, c) => sum + c.episodesCount, 0)
  let content = ''
  try {
    content = fs.readFileSync(LOG_PATH, 'utf-8')
  } catch {
    content = `---\nlastGeneration: \ntotalPostsGenerated: 0\n---\n\n## Générations\n`
  }

  // Update frontmatter
  const existingTotal = parseInt(content.match(/totalPostsGenerated:\s*(\d+)/)?.[1] ?? '0', 10)
  content = content
    .replace(/lastGeneration:.*/, `lastGeneration: ${entry.date}`)
    .replace(/totalPostsGenerated:\s*\d+/, `totalPostsGenerated: ${existingTotal + totalPosts}`)

  // Append entry
  content = content.trimEnd() + '\n\n' + serializeLogEntry(entry) + '\n'
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true })
  fs.writeFileSync(LOG_PATH, content, 'utf-8')
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `cd /Users/jonathanbraun/cmo-agent/dashboard && npm test -- generation-log`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/jonathanbraun/cmo-agent add dashboard/lib/generation-log.ts dashboard/lib/generation-log.test.ts
git -C /Users/jonathanbraun/cmo-agent commit -m "feat(strategy): add generation-log lib with read/append and unit tests"
```

---

## Task 4: Create initial `content/strategy/generation-log.md`

**Files:**
- Create: `content/strategy/generation-log.md`

- [ ] **Step 1: Create the initial log file**

```bash
mkdir -p /Users/jonathanbraun/cmo-agent/content/strategy
```

Create `content/strategy/generation-log.md`:

```markdown
---
lastGeneration:
totalPostsGenerated: 0
---

## Générations
```

- [ ] **Step 2: Commit**

```bash
git -C /Users/jonathanbraun/cmo-agent add content/strategy/generation-log.md
git -C /Users/jonathanbraun/cmo-agent commit -m "feat(strategy): add initial generation log file"
```

---

## Task 5: Create `lib/generate-strategy.ts`

**Files:**
- Create: `dashboard/lib/generate-strategy.ts`

This file contains two helpers and the main Claude call:
- `readIdeasSummary()`: calls `listIdeas()`, formats top-50 as a string
- `generateStrategyPlan(req)`: reads CLAUDE.md + log + ideas, calls Claude, returns `GeneratePlanResponse`

- [ ] **Step 1: Implement `dashboard/lib/generate-strategy.ts`**

```ts
import fs from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { listIdeas } from './parse-ideas'
import { readGenerationLog } from './generation-log'
import { CMO_SYSTEM_PROMPT } from './prompts'
import type { GeneratePlanRequest, GeneratePlanResponse } from './types'

const CMO_BASE = process.env.CMO_BASE ?? '/Users/jonathanbraun/cmo-agent'
const CLAUDE_MD_PATH = path.join(CMO_BASE, 'CLAUDE.md')

const client = new Anthropic()

export async function readIdeasSummary(): Promise<string> {
  const ideas = listIdeas().slice(0, 50)
  if (ideas.length === 0) return 'Aucune idée dans le backlog.'
  const lines = ideas.map(i => `- "${i.sujet}" [${i.pilier}]`).join('\n')
  return `Idées existantes (${ideas.length}) :\n${lines}`
}

export async function generateStrategyPlan(req: GeneratePlanRequest): Promise<GeneratePlanResponse> {
  const claudeMd = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8')
  const [logSummary, ideasSummary] = await Promise.all([
    readGenerationLog(),
    readIdeasSummary(),
  ])

  const userPrompt = `Tu dois proposer un plan de contenu LinkedIn stratégique pour ${req.semaines} semaines.
${req.contexte ? `\nContexte fourni par Jonathan : ${req.contexte}\n` : ''}
---

## Profil et positionnement (CLAUDE.md)

${claudeMd}

---

## Historique des générations précédentes (à éviter pour ne pas répéter)

${logSummary}

---

## Idées déjà dans le backlog (à éviter les doublons)

${ideasSummary}

---

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
      "duree": 2,
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

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  try {
    return JSON.parse(text) as GeneratePlanResponse
  } catch {
    throw new Error(`Claude returned non-JSON response: ${text.slice(0, 300)}`)
  }
}
```

- [ ] **Step 2: TypeScript check**

Run: `cd /Users/jonathanbraun/cmo-agent/dashboard && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git -C /Users/jonathanbraun/cmo-agent add dashboard/lib/generate-strategy.ts
git -C /Users/jonathanbraun/cmo-agent commit -m "feat(strategy): add generate-strategy lib (Bloc 1 Claude call + ideas summary)"
```

---

## Task 6: Create API routes

**Files:**
- Create: `dashboard/app/api/strategy/generate-plan/route.ts`
- Create: `dashboard/app/api/strategy/update-log/route.ts`

- [ ] **Step 1: Create `dashboard/app/api/strategy/generate-plan/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { generateStrategyPlan } from '@/lib/generate-strategy'
import type { GeneratePlanRequest } from '@/lib/types'

export async function POST(request: Request) {
  try {
    const body = await request.json() as GeneratePlanRequest
    if (!body.semaines || body.semaines < 1) {
      return NextResponse.json({ error: 'semaines requis (min 1)' }, { status: 400 })
    }
    const result = await generateStrategyPlan(body)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create `dashboard/app/api/strategy/update-log/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { appendGenerationEntry } from '@/lib/generation-log'
import type { GenerationEntry } from '@/lib/types'

export async function POST(request: Request) {
  try {
    const body = await request.json() as GenerationEntry
    if (!body.date || !body.campaigns?.length) {
      return NextResponse.json({ error: 'date et campaigns requis' }, { status: 400 })
    }
    await appendGenerationEntry(body)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 3: TypeScript check**

Run: `cd /Users/jonathanbraun/cmo-agent/dashboard && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git -C /Users/jonathanbraun/cmo-agent add dashboard/app/api/strategy/
git -C /Users/jonathanbraun/cmo-agent commit -m "feat(strategy): add POST /api/strategy/generate-plan and /api/strategy/update-log routes"
```

---

## Task 7: Add "Stratégie" to Sidebar

**Files:**
- Modify: `dashboard/components/Sidebar.tsx`

- [ ] **Step 1: Add entry to NAV array**

In `Sidebar.tsx`, in the `NAV` array, add after the `Campagnes` entry:
```ts
{ href: '/strategie', label: 'Stratégie', icon: '⊕' },
```

The NAV array becomes:
```ts
const NAV = [
  { href: '/', label: 'Planification', icon: '⊞' },
  { href: '/campagnes', label: 'Campagnes', icon: '◈' },
  { href: '/strategie', label: 'Stratégie', icon: '⊕' },
  { href: '/performances', label: 'Performances', icon: '↑' },
]
```

- [ ] **Step 2: Commit**

```bash
git -C /Users/jonathanbraun/cmo-agent add dashboard/components/Sidebar.tsx
git -C /Users/jonathanbraun/cmo-agent commit -m "feat(strategy): add Stratégie entry to sidebar"
```

---

## Task 8: Create `StrategyPlanner` component

**Files:**
- Create: `dashboard/components/StrategyPlanner.tsx`

This is the main client component. It manages a 3-step flow with `useState`. No Context needed.

- [ ] **Step 1: Create `dashboard/components/StrategyPlanner.tsx`**

```tsx
'use client'
import { useState } from 'react'
import type { ProposedCampaign, GeneratePlanResponse, Campaign, CampaignGenerateRequest, GenerationEntry } from '@/lib/types'

type Step = 'params' | 'review' | 'generating' | 'done'

type StrategyState = {
  step: Step
  semaines: number
  contexte: string
  proposedCampaigns: ProposedCampaign[]
  selectedIndices: Set<number>
  progress: { current: number; total: number; currentTitle: string }
  error: string | null
  result: { campaignsCreated: number; episodesGenerated: number } | null
}

const INITIAL_STATE: StrategyState = {
  step: 'params',
  semaines: 12,
  contexte: '',
  proposedCampaigns: [],
  selectedIndices: new Set(),
  progress: { current: 0, total: 0, currentTitle: '' },
  error: null,
  result: null,
}

export function StrategyPlanner() {
  const [state, setState] = useState<StrategyState>(INITIAL_STATE)

  // ── Bloc 1 ──────────────────────────────────────────────────────────────────

  async function handleGeneratePlan() {
    setState(s => ({ ...s, error: null, step: 'review', proposedCampaigns: [] }))
    try {
      const res = await fetch('/api/strategy/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ semaines: state.semaines, contexte: state.contexte || undefined }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data: GeneratePlanResponse = await res.json()
      setState(s => ({
        ...s,
        proposedCampaigns: data.campaigns,
        selectedIndices: new Set(data.campaigns.map((_, i) => i)),
      }))
    } catch (e) {
      setState(s => ({ ...s, step: 'params', error: String(e) }))
    }
  }

  // ── Bloc 2 ──────────────────────────────────────────────────────────────────

  async function handleGenerateCampaigns() {
    const selected = state.proposedCampaigns.filter((_, i) => state.selectedIndices.has(i))
    setState(s => ({
      ...s,
      step: 'generating',
      progress: { current: 0, total: selected.length, currentTitle: selected[0]?.titre ?? '' },
    }))

    const generationEntries: Array<{ titre: string; pilier: string; episodesCount: number }> = []

    try {
      for (let i = 0; i < selected.length; i++) {
        const proposed = selected[i]
        setState(s => ({
          ...s,
          progress: { current: i + 1, total: selected.length, currentTitle: proposed.titre },
        }))

        // Step A: create campaign (slug generated server-side)
        const createRes = await fetch('/api/campagnes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ titre: proposed.titre, format: proposed.format, duree: proposed.duree }),
        })
        if (!createRes.ok) throw new Error(`Erreur création campagne "${proposed.titre}": ${await createRes.text()}`)
        const campaign: Campaign = await createRes.json()

        // Step B: generate content (returns Campaign with episodesSlug filled)
        const generateBody: CampaignGenerateRequest = {
          slug: campaign.slug,
          titre: proposed.titre,
          format: proposed.format,
          duree: proposed.duree,
          objectif: proposed.objectif,
          contexte: undefined,
        }
        const generateRes = await fetch('/api/campagnes/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(generateBody),
        })
        if (!generateRes.ok) throw new Error(`Erreur génération "${proposed.titre}": ${await generateRes.text()}`)
        const updatedCampaign: Campaign = await generateRes.json()

        generationEntries.push({
          titre: proposed.titre,
          pilier: proposed.pilier,
          episodesCount: updatedCampaign.episodesSlug.length,
        })
      }

      // Update log
      const entry: GenerationEntry = {
        date: new Date().toISOString().split('T')[0],
        semaines: state.semaines,
        campaigns: generationEntries,
      }
      await fetch('/api/strategy/update-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })

      const totalEpisodes = generationEntries.reduce((sum, c) => sum + c.episodesCount, 0)
      setState(s => ({
        ...s,
        step: 'done',
        result: { campaignsCreated: selected.length, episodesGenerated: totalEpisodes },
      }))
    } catch (e) {
      setState(s => ({ ...s, step: 'review', error: String(e) }))
    }
  }

  // ── Toggle helpers ───────────────────────────────────────────────────────────

  function toggleCampaign(i: number) {
    setState(s => {
      const next = new Set(s.selectedIndices)
      next.has(i) ? next.delete(i) : next.add(i)
      return { ...s, selectedIndices: next }
    })
  }

  function toggleAll() {
    setState(s => ({
      ...s,
      selectedIndices: s.selectedIndices.size === s.proposedCampaigns.length
        ? new Set()
        : new Set(s.proposedCampaigns.map((_, i) => i)),
    }))
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    padding: '16px 20px',
    marginBottom: 12,
  }

  return (
    <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--color-primary)' }}>
        ⊕ Moteur Stratégique
      </h1>
      <p style={{ color: 'var(--color-muted-foreground)', marginBottom: 32, fontSize: 14 }}>
        L'agent CMO analyse votre positionnement et propose un plan de campagnes sur mesure.
      </p>

      {state.error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, padding: '12px 16px', marginBottom: 20, color: '#b91c1c', fontSize: 13 }}>
          {state.error}
        </div>
      )}

      {/* ── Step: params ─────────────────────────────────────────────────────── */}
      {state.step === 'params' && (
        <div style={{ maxWidth: 520 }}>
          <div style={cardStyle}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
              Nombre de semaines à planifier
            </label>
            <input
              type="number"
              min={1}
              max={24}
              value={state.semaines}
              onChange={e => setState(s => ({ ...s, semaines: Math.max(1, Math.min(24, parseInt(e.target.value) || 1)) }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 15, background: 'var(--color-background)' }}
            />
            <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', marginTop: 6 }}>Entre 1 et 24 semaines</p>
          </div>

          <div style={cardStyle}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
              Contexte optionnel
            </label>
            <textarea
              rows={4}
              placeholder="Ex: Lancement de la formation IA en avril, focus sur les dirigeants pharma ce trimestre..."
              value={state.contexte}
              onChange={e => setState(s => ({ ...s, contexte: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 13, background: 'var(--color-background)', resize: 'vertical' }}
            />
          </div>

          <button
            onClick={handleGeneratePlan}
            style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Générer le plan stratégique
          </button>
        </div>
      )}

      {/* ── Step: review (loading or loaded) ────────────────────────────────── */}
      {state.step === 'review' && (
        <div style={{ maxWidth: 680 }}>
          {state.proposedCampaigns.length === 0 ? (
            <div style={{ color: 'var(--color-muted-foreground)', fontSize: 14 }}>
              Analyse en cours — Claude lit votre positionnement et l'historique...
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>
                  Plan proposé pour {state.semaines} semaines — {state.proposedCampaigns.length} campagnes
                </h2>
                <button
                  onClick={toggleAll}
                  style={{ fontSize: 13, background: 'none', border: '1px solid var(--color-border)', borderRadius: 5, padding: '5px 12px', cursor: 'pointer', color: 'var(--color-muted-foreground)' }}
                >
                  {state.selectedIndices.size === state.proposedCampaigns.length ? 'Tout déselectionner' : 'Tout sélectionner'}
                </button>
              </div>

              {state.proposedCampaigns.map((c, i) => (
                <div
                  key={i}
                  style={{ ...cardStyle, opacity: state.selectedIndices.has(i) ? 1 : 0.5, cursor: 'pointer' }}
                  onClick={() => toggleCampaign(i)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <input
                      type="checkbox"
                      checked={state.selectedIndices.has(i)}
                      onChange={() => toggleCampaign(i)}
                      onClick={e => e.stopPropagation()}
                      style={{ marginTop: 3, cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{c.titre}</span>
                        <span style={{ fontSize: 11, background: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>{c.format}</span>
                        <span style={{ fontSize: 11, color: 'var(--color-muted-foreground)' }}>{c.duree} mois</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)', marginBottom: 6 }}>{c.pilier}</div>
                      <div style={{ fontSize: 13, color: 'var(--color-foreground)' }}>{c.objectif}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)', marginTop: 6, fontStyle: 'italic' }}>{c.rationale}</div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                disabled={state.selectedIndices.size === 0}
                onClick={handleGenerateCampaigns}
                style={{
                  marginTop: 8,
                  background: state.selectedIndices.size === 0 ? 'var(--color-border)' : 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: state.selectedIndices.size === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Générer {state.selectedIndices.size} campagne{state.selectedIndices.size > 1 ? 's' : ''} sélectionnée{state.selectedIndices.size > 1 ? 's' : ''}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Step: generating ────────────────────────────────────────────────── */}
      {state.step === 'generating' && (
        <div style={{ maxWidth: 520 }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
              Campagne {state.progress.current}/{state.progress.total} — {state.progress.currentTitle}
            </div>
            <div style={{ background: 'var(--color-border)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                background: 'var(--color-primary)',
                width: `${(state.progress.current / state.progress.total) * 100}%`,
                transition: 'width 0.4s ease',
              }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)', marginTop: 8 }}>
              Génération du contenu en cours...
            </div>
          </div>
        </div>
      )}

      {/* ── Step: done ──────────────────────────────────────────────────────── */}
      {state.step === 'done' && state.result && (
        <div style={{ maxWidth: 520 }}>
          <div style={{ ...cardStyle, borderColor: 'var(--color-primary)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--color-primary)' }}>
              Génération terminée
            </div>
            <div style={{ fontSize: 14, color: 'var(--color-foreground)', marginBottom: 16 }}>
              {state.result.campaignsCreated} campagne{state.result.campaignsCreated > 1 ? 's' : ''} créée{state.result.campaignsCreated > 1 ? 's' : ''} — {state.result.episodesGenerated} épisodes générés
            </div>
            <a
              href="/campagnes"
              style={{ display: 'inline-block', background: 'var(--color-primary)', color: '#fff', textDecoration: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 14, fontWeight: 600 }}
            >
              Voir dans le backlog →
            </a>
          </div>
          <button
            onClick={() => setState(INITIAL_STATE)}
            style={{ marginTop: 12, fontSize: 13, background: 'none', border: '1px solid var(--color-border)', borderRadius: 5, padding: '6px 14px', cursor: 'pointer', color: 'var(--color-muted-foreground)' }}
          >
            Nouveau plan
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

Run: `cd /Users/jonathanbraun/cmo-agent/dashboard && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git -C /Users/jonathanbraun/cmo-agent add dashboard/components/StrategyPlanner.tsx
git -C /Users/jonathanbraun/cmo-agent commit -m "feat(strategy): add StrategyPlanner client component (3-step flow)"
```

---

## Task 9: Create `/strategie` page

**Files:**
- Create: `dashboard/app/strategie/page.tsx`

- [ ] **Step 1: Create `dashboard/app/strategie/page.tsx`**

```tsx
import { Sidebar } from '@/components/Sidebar'
import { StrategyPlanner } from '@/components/StrategyPlanner'

export default function StrategiePage() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <StrategyPlanner />
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

Run: `cd /Users/jonathanbraun/cmo-agent/dashboard && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Run full test suite**

Run: `cd /Users/jonathanbraun/cmo-agent/dashboard && npm test`
Expected: all 32+ tests pass (including new generation-log tests)

- [ ] **Step 4: Start dev server and manually verify**

Run: `cd /Users/jonathanbraun/cmo-agent/dashboard && ANTHROPIC_API_KEY=<key> npm run dev`

Verify manually:
- [ ] `/strategie` loads without error
- [ ] Sidebar shows "⊕ Stratégie" link, active when on `/strategie`
- [ ] Params form accepts semaines 1-24, contexte textarea
- [ ] "Générer le plan stratégique" triggers Bloc 1, transitions to review step
- [ ] Proposed campaigns show with checkboxes, toggle-all works
- [ ] Generate button disabled when 0 selected
- [ ] Bloc 2 runs sequentially, progress bar advances
- [ ] Done state shows summary + "Voir dans le backlog" link
- [ ] New campaigns appear at `/campagnes`

- [ ] **Step 5: Commit**

```bash
git -C /Users/jonathanbraun/cmo-agent add dashboard/app/strategie/page.tsx
git -C /Users/jonathanbraun/cmo-agent commit -m "feat(strategy): add /strategie page — Strategy Engine complete"
```

---

## Done

All tasks complete when:
- `npm test` passes (32+ tests including generation-log)
- `npx tsc --noEmit` clean
- `/strategie` page works end-to-end
- `/campagnes` shows campaigns created via strategy engine
- `content/strategy/generation-log.md` updated after generation
