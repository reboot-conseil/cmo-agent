# Quick Post → Backlog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `QuickPostPanel` in the left column of "Cette semaine" so Jonathan can type a subject, have Claude infer pilier/format and generate a hook, and land the idea in the backlog as a `draft`.

**Architecture:** New lib file `generate-quick-post.ts` follows the exact `generate-veille.ts` pattern (Anthropic client + prompt + typed parser). A thin route at `/api/cette-semaine/quick-post` delegates to it and calls `writeIdea()`. An autonomous `QuickPostPanel` component handles all UI state with no shared state with the page.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Anthropic SDK (`claude-sonnet-4-6`), Vitest

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `dashboard/lib/generate-quick-post.ts` | Prompt, parser, Claude call |
| Create | `dashboard/lib/generate-quick-post.test.ts` | Unit tests for the parser |
| Create | `dashboard/app/api/cette-semaine/quick-post/route.ts` | Thin API route |
| Create | `dashboard/components/QuickPostPanel.tsx` | Autonomous UI component |
| Modify | `dashboard/app/page.tsx` | Add `<QuickPostPanel />` to left column |

---

## Task 1 — Parser + unit tests (`generate-quick-post.ts`)

**Files:**
- Create: `dashboard/lib/generate-quick-post.ts`
- Create: `dashboard/lib/generate-quick-post.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `dashboard/lib/generate-quick-post.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseQuickPostResponse } from './generate-quick-post'

describe('parseQuickPostResponse', () => {
  it('parses a valid JSON object', () => {
    const raw = JSON.stringify({
      pilier: 'IA & Transformation',
      format: 'Post',
      hook: "La plupart des dirigeants veulent de l'IA. Presque aucun ne sait par où commencer.",
    })
    const result = parseQuickPostResponse(raw)
    expect(result.pilier).toBe('IA & Transformation')
    expect(result.format).toBe('Post')
    expect(result.hook).toBe("La plupart des dirigeants veulent de l'IA. Presque aucun ne sait par où commencer.")
  })

  it('handles JSON wrapped in markdown fences', () => {
    const raw = '```json\n{"pilier":"Stratégie & Décision","format":"Carrousel","hook":"3 questions que personne ne pose avant de lancer un projet IA."}\n```'
    const result = parseQuickPostResponse(raw)
    expect(result.pilier).toBe('Stratégie & Décision')
    expect(result.format).toBe('Carrousel')
  })

  it('returns fallback on unparseable response', () => {
    const result = parseQuickPostResponse('not json at all')
    expect(result.pilier).toBe('IA & Transformation')
    expect(result.format).toBe('Post')
    expect(result.hook).toBe('')
  })

  it('returns fallback on missing fields', () => {
    const result = parseQuickPostResponse('{}')
    expect(result.pilier).toBe('IA & Transformation')
    expect(result.format).toBe('Post')
    expect(result.hook).toBe('')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd dashboard && npx vitest run lib/generate-quick-post.test.ts
```

Expected: FAIL — `Cannot find module './generate-quick-post'`

- [ ] **Step 3: Create `generate-quick-post.ts` with parser + generator**

Create `dashboard/lib/generate-quick-post.ts`:

```ts
import Anthropic from '@anthropic-ai/sdk'
import type { Format } from './types'
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
}

const QUICK_POST_PROMPT = (sujet: string) => `À partir du sujet suivant, génère les métadonnées pour un post LinkedIn de Jonathan BRAUN.

Sujet : "${sujet}"

Piliers éditoriaux valides (choisis le plus pertinent) :
- IA & Transformation (25%) — impact concret de l'IA sur les organisations
- Stratégie & Décision (20%) — pourquoi la stratégie prime sur la tech
- Business & ROI (20%) — cas concrets, POC, quick wins, chiffres
- Neurosciences & Adoption (15%) — biais cognitifs, résistance au changement
- Innovation & Prospective (10%) — signaux faibles, tendances 2-5 ans
- Coulisses & Authenticité (10%) — parcours, équipe, apprentissages, vulnérabilité

Formats valides :
- Post (par défaut)
- Carrousel (si le sujet se prête à une liste, étapes, comparaison ou framework visuel)
- Article, Vidéo, Newsletter (si le sujet l'exige clairement)

Hook : 1 à 2 lignes max, visible avant "voir plus" sur LinkedIn. Percutant, direct, ancré dans le terrain. Pas de "Je suis ravi de..." ni de "C'est avec plaisir...".

Réponds UNIQUEMENT avec un objet JSON valide :
{
  "pilier": "un des 6 piliers ci-dessus (texte exact)",
  "format": "Post | Carrousel | Article | Vidéo | Newsletter",
  "hook": "1-2 lignes d'accroche"
}`

export function parseQuickPostResponse(raw: string): QuickPostResult {
  const text = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return { ...QUICK_POST_FALLBACK }
  try {
    const parsed = JSON.parse(match[0]) as Partial<QuickPostResult>
    const pilier = VALID_PILIERS.includes(parsed.pilier ?? '') ? (parsed.pilier as string) : QUICK_POST_FALLBACK.pilier
    const format = VALID_FORMATS.includes(parsed.format as Format) ? (parsed.format as Format) : QUICK_POST_FALLBACK.format
    const hook = typeof parsed.hook === 'string' && parsed.hook.length > 0 ? parsed.hook : ''
    return { pilier, format, hook }
  } catch {
    return { ...QUICK_POST_FALLBACK }
  }
}

export async function generateQuickPost(sujet: string): Promise<QuickPostResult> {
  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: CMO_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: QUICK_POST_PROMPT(sujet) }],
  })
  const textBlock = response.content.find(b => b.type === 'text')
  const raw = textBlock?.type === 'text' ? textBlock.text : ''
  return parseQuickPostResponse(raw)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd dashboard && npx vitest run lib/generate-quick-post.test.ts
```

Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
cd dashboard && git add lib/generate-quick-post.ts lib/generate-quick-post.test.ts
git commit -m "feat: add generateQuickPost lib with parser and Claude call"
```

---

## Task 2 — API route

**Files:**
- Create: `dashboard/app/api/cette-semaine/quick-post/route.ts`

- [ ] **Step 1: Create the route**

```bash
mkdir -p dashboard/app/api/cette-semaine/quick-post
```

Create `dashboard/app/api/cette-semaine/quick-post/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { generateQuickPost } from '@/lib/generate-quick-post'
import { writeIdea, slugify } from '@/lib/parse-ideas'
import type { Idea, Format } from '@/lib/types'

const VISUEL_TYPE: Record<Format, string> = {
  Post: 'Photo authentique',
  Carrousel: 'Slides carrousel',
  Article: 'Photo authentique',
  Vidéo: 'Script vidéo',
  Newsletter: 'Photo authentique',
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { sujet?: string }

    if (!body.sujet || body.sujet.trim() === '') {
      return NextResponse.json({ error: 'sujet is required' }, { status: 400 })
    }

    const sujet = body.sujet.trim()
    const { pilier, format, hook } = await generateQuickPost(sujet)

    const ts = Date.now().toString(36)
    const slug = `${slugify(sujet)}-${ts}`
    const today = new Date().toISOString().split('T')[0]

    const idea: Idea = {
      slug,
      sujet,
      pilier,
      format,
      hook,
      texte: '',
      statut: 'draft',
      semaine: null,
      jour: null,
      createdAt: today,
      visuelType: VISUEL_TYPE[format] ?? 'Photo authentique',
      visuelDescription: '',
      hashtags: [],
    }

    writeIdea(idea)
    return NextResponse.json({ idea })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify the dev server compiles without errors**

```bash
cd dashboard && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd dashboard && git add app/api/cette-semaine/quick-post/route.ts
git commit -m "feat: add /api/cette-semaine/quick-post route"
```

---

## Task 3 — UI component

**Files:**
- Create: `dashboard/components/QuickPostPanel.tsx`

- [ ] **Step 1: Create the component**

Create `dashboard/components/QuickPostPanel.tsx`:

```tsx
'use client'
import { useState } from 'react'
import type { Idea } from '@/lib/types'

export function QuickPostPanel() {
  const [sujet, setSujet] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit() {
    if (!sujet.trim() || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/cette-semaine/quick-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sujet }),
      })
      if (!res.ok) throw new Error(await res.text())
      setSujet('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e) {
      console.error('Quick post error:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontSize: 12, fontWeight: 600, color: 'var(--color-muted-foreground)',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
      }}>
        Idée one-shot
      </div>
      <textarea
        value={sujet}
        onChange={e => setSujet(e.target.value)}
        placeholder="Un sujet précis → Claude génère le hook et l'ajoute au backlog"
        rows={3}
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
          marginBottom: 8,
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={!sujet.trim() || loading}
        style={{
          width: '100%',
          fontSize: 13, padding: '7px 14px', borderRadius: 6,
          background: 'var(--color-primary)', color: '#fff',
          border: 'none', cursor: (!sujet.trim() || loading) ? 'not-allowed' : 'pointer',
          fontWeight: 600, opacity: (!sujet.trim() || loading) ? 0.5 : 1,
        }}
      >
        {loading ? 'Génération...' : 'Générer → Backlog'}
      </button>
      {success && (
        <div style={{
          marginTop: 8, fontSize: 12, color: '#10b981',
          fontWeight: 600, textAlign: 'center',
        }}>
          Ajouté au backlog
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run type check**

```bash
cd dashboard && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd dashboard && git add components/QuickPostPanel.tsx
git commit -m "feat: add QuickPostPanel component"
```

---

## Task 4 — Wire into page

**Files:**
- Modify: `dashboard/app/page.tsx`

- [ ] **Step 1: Add the import and render the component**

In `dashboard/app/page.tsx`, add the import at the top with the other panel imports:

```ts
import { QuickPostPanel } from '@/components/QuickPostPanel'
```

Then add `<QuickPostPanel />` in the left column after `<VeillePanel />`:

```tsx
<NoteVocalePanel value={noteVocale} onChange={setNoteVocale} />
<VeillePanel items={veille} loading={veilleLoading} onFetch={handleFetchVeille} />
<QuickPostPanel />
```

- [ ] **Step 2: Run type check**

```bash
cd dashboard && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Run all tests**

```bash
cd dashboard && npx vitest run
```

Expected: all tests pass including the new `generate-quick-post.test.ts`

- [ ] **Step 4: Commit**

```bash
cd dashboard && git add app/page.tsx
git commit -m "feat: wire QuickPostPanel into Cette semaine page"
```

---

## Manual Smoke Test

Once the dev server is running (`npm run dev` in `dashboard/`):

1. Open `http://localhost:3001`
2. Scroll to the bottom of the left column — "Idée one-shot" panel should be visible
3. Type a subject (e.g. "Les 3 erreurs que font les DAF face à un projet IA")
4. Click "Générer → Backlog"
5. Button shows "Génération..." for ~5-10s
6. "Ajouté au backlog" appears in green, field clears
7. Go to `http://localhost:3001/calendrier` → Backlog — the idea should appear with pilier, format, and hook pre-filled
