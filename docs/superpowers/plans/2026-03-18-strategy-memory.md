# Strategy Memory & Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrichir la page `/strategie` avec un Bloc Socle (parsing CLAUDE.md, statique) et un Bloc Vision (mémoire IA générée + note Jonathan, persistée dans vision.md et injectée dans Bloc 1).

**Architecture:** `StrategyFoundation` est un server component qui reçoit les sections parsées de CLAUDE.md. `StrategyMemory` est un client component qui charge la vision depuis `initialData` et pilote les appels API. La vision est persistée dans `content/strategy/vision.md` et injectée dans le prompt `generateStrategyPlan()`.

**Tech Stack:** Next.js 15 App Router, TypeScript, Vitest, Anthropic SDK (`@anthropic-ai/sdk`), `fs` (Node.js).

---

## File Map

| Action | Fichier | Responsabilité |
|--------|---------|----------------|
| Modify | `dashboard/lib/types.ts` | Ajouter `CLAUDEMdSections`, `VisionResponse`, `VisionData` |
| Modify | `dashboard/lib/generation-log.ts` | Ajouter `readFullGenerationLog()` |
| Modify | `dashboard/lib/generation-log.test.ts` | Tests pour `readFullGenerationLog()` |
| Create | `dashboard/lib/vision.ts` | IO vision.md + helpers purs |
| Create | `dashboard/lib/vision.test.ts` | Tests helpers purs |
| Create | `dashboard/lib/generate-vision.ts` | Appel Claude → VisionResponse |
| Create | `dashboard/app/api/strategy/generate-vision/route.ts` | POST — génère + sauvegarde vision |
| Create | `dashboard/app/api/strategy/save-note/route.ts` | POST — sauvegarde note Jonathan |
| Create | `content/strategy/vision.md` | Fichier de persistance initial (vide) |
| Create | `dashboard/components/StrategyFoundation.tsx` | Server component — sections CLAUDE.md |
| Create | `dashboard/components/StrategyMemory.tsx` | Client component — vision IA + note |
| Modify | `dashboard/lib/generate-strategy.ts` | Ajouter `readIdeasSummaryFull()`, injecter vision |
| Modify | `dashboard/app/strategie/page.tsx` | Async server component, 3 blocs |

---

## Task 1: Ajouter les types Strategy Memory dans `lib/types.ts`

**Files:**
- Modify: `dashboard/lib/types.ts`

- [ ] **Step 1: Ouvrir `dashboard/lib/types.ts` et ajouter le bloc suivant à la fin**

```ts
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
```

- [ ] **Step 2: Vérifier que TypeScript compile sans erreur**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx tsc --noEmit
```

Expected: aucune erreur de compilation.

- [ ] **Step 3: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent
git add dashboard/lib/types.ts
git commit -m "feat(strategy-memory): add CLAUDEMdSections, VisionResponse, VisionData types"
```

---

## Task 2: Ajouter `readFullGenerationLog()` dans `generation-log.ts`

**Files:**
- Modify: `dashboard/lib/generation-log.ts`
- Modify: `dashboard/lib/generation-log.test.ts`

Note : le pattern du codebase est de tester uniquement les helpers purs (pas les fonctions IO qui lisent le filesystem). `readFullGenerationLog()` est une fonction IO — ses tests ne sont donc pas unitarisables sans mock. Le test ci-dessous valide la logique pure (même combinaison de `parseLogEntries` + formatage) qui est la seule partie testable.

- [ ] **Step 1: Ajouter `readFullGenerationLog()` à la fin de `generation-log.ts`**

```ts
export async function readFullGenerationLog(): Promise<string> {
  try {
    const content = fs.readFileSync(LOG_PATH, 'utf-8')
    const entries = parseLogEntries(content)
    if (entries.length === 0) return 'Aucune génération précédente.'
    return `Toutes les générations (${entries.length}) :\n\n${entries.join('\n\n')}`
  } catch {
    return 'Aucune génération précédente.'
  }
}
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 3: Lancer les tests existants pour s'assurer qu'on n'a rien cassé**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx vitest run lib/generation-log.test.ts
```

Expected: tous les tests PASS.

- [ ] **Step 4: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent
git add dashboard/lib/generation-log.ts
git commit -m "feat(strategy-memory): add readFullGenerationLog() to generation-log"
```

---

## Task 3: Créer `dashboard/lib/vision.ts` et `vision.test.ts`

**Files:**
- Create: `dashboard/lib/vision.ts`
- Create: `dashboard/lib/vision.test.ts`

- [ ] **Step 1: Écrire les tests dans `dashboard/lib/vision.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { extractJsonFromVisionSection, extractNoteSection, serializeVisionFile } from './vision'
import type { VisionResponse } from './types'

const SAMPLE_VISION: VisionResponse = {
  situationActuelle: 'Jonathan publie régulièrement sur LinkedIn.',
  directionRecommandee: 'Aller vers plus de cas terrain.',
  priorites: ['IA & Transformation', 'Business & ROI'],
  themesAEviter: ['Hype IA générique'],
  coherence: 'Bon alignement avec CLAUDE.md.',
}

const SAMPLE_FILE = `---
generatedAt: 2026-03-18
---

## Vision IA

\`\`\`json
${JSON.stringify(SAMPLE_VISION, null, 2)}
\`\`\`

## Note Jonathan

Mon contexte personnel ici.
`

describe('extractJsonFromVisionSection', () => {
  it('parses VisionResponse from vision.md content', () => {
    const result = extractJsonFromVisionSection(SAMPLE_FILE)
    expect(result).not.toBeNull()
    expect(result!.situationActuelle).toBe('Jonathan publie régulièrement sur LinkedIn.')
    expect(result!.priorites).toHaveLength(2)
  })

  it('returns null when no json block present', () => {
    const result = extractJsonFromVisionSection('## Vision IA\n\nRien ici.')
    expect(result).toBeNull()
  })

  it('returns null when json block is invalid JSON', () => {
    const result = extractJsonFromVisionSection('## Vision IA\n\n```json\nnot-valid\n```')
    expect(result).toBeNull()
  })
})

describe('extractNoteSection', () => {
  it('extracts the note Jonathan content', () => {
    const note = extractNoteSection(SAMPLE_FILE)
    expect(note.trim()).toBe('Mon contexte personnel ici.')
  })

  it('returns empty string when no Note Jonathan section', () => {
    const note = extractNoteSection('## Vision IA\n\nSomething')
    expect(note).toBe('')
  })
})

describe('serializeVisionFile', () => {
  it('produces a file with frontmatter, json block, and note', () => {
    const output = serializeVisionFile(SAMPLE_VISION, 'Ma note', '2026-03-18')
    expect(output).toContain('generatedAt: 2026-03-18')
    expect(output).toContain('```json')
    expect(output).toContain('situationActuelle')
    expect(output).toContain('## Note Jonathan')
    expect(output).toContain('Ma note')
  })

  it('preserves empty note', () => {
    const output = serializeVisionFile(SAMPLE_VISION, '', '2026-03-18')
    expect(output).toContain('## Note Jonathan\n\n')
  })

  it('round-trips: serialize then parse gives original vision', () => {
    const serialized = serializeVisionFile(SAMPLE_VISION, 'note', '2026-03-18')
    const parsed = extractJsonFromVisionSection(serialized)
    expect(parsed).toEqual(SAMPLE_VISION)
  })
})
```

- [ ] **Step 2: Lancer les tests — ils doivent échouer (module non créé)**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx vitest run lib/vision.test.ts
```

Expected: FAIL — `Cannot find module './vision'`

- [ ] **Step 3: Créer `dashboard/lib/vision.ts`**

```ts
import fs from 'fs'
import path from 'path'
import type { VisionData, VisionResponse } from './types'

const CMO_BASE = process.env.CMO_BASE ?? '/Users/jonathanbraun/cmo-agent'
export const VISION_PATH = path.join(CMO_BASE, 'content/strategy/vision.md')

// ─── Pure helpers (exported for tests) ─────────────────────────────────────

export function extractJsonFromVisionSection(content: string): VisionResponse | null {
  const visionMatch = content.match(/## Vision IA\n([\s\S]*?)(?=\n## |$)/)
  if (!visionMatch) return null
  const jsonMatch = visionMatch[1].match(/```json\n([\s\S]*?)\n```/)
  if (!jsonMatch) return null
  try {
    return JSON.parse(jsonMatch[1]) as VisionResponse
  } catch {
    return null
  }
}

export function extractNoteSection(content: string): string {
  const noteMatch = content.match(/## Note Jonathan\n\n([\s\S]*)$/)
  if (!noteMatch) return ''
  return noteMatch[1].trim()
}

export function serializeVisionFile(
  vision: VisionResponse,
  note: string,
  generatedAt: string,
): string {
  return `---
generatedAt: ${generatedAt}
---

## Vision IA

\`\`\`json
${JSON.stringify(vision, null, 2)}
\`\`\`

## Note Jonathan

${note}
`
}

// ─── Filesystem IO ──────────────────────────────────────────────────────────

export async function readVision(): Promise<VisionData> {
  try {
    const content = fs.readFileSync(VISION_PATH, 'utf-8')
    const visionIA = extractJsonFromVisionSection(content)
    const noteJonathan = extractNoteSection(content)
    const generatedAtMatch = content.match(/generatedAt:\s*(.+)/)
    const generatedAt = generatedAtMatch ? generatedAtMatch[1].trim() : null
    return { visionIA, noteJonathan, generatedAt }
  } catch {
    return { visionIA: null, noteJonathan: '', generatedAt: null }
  }
}

export async function saveVision(vision: VisionResponse, generatedAt: string): Promise<void> {
  let existingNote = ''
  try {
    const existing = fs.readFileSync(VISION_PATH, 'utf-8')
    existingNote = extractNoteSection(existing)
  } catch {
    // first time — no existing note
  }
  fs.mkdirSync(path.dirname(VISION_PATH), { recursive: true })
  fs.writeFileSync(VISION_PATH, serializeVisionFile(vision, existingNote, generatedAt), 'utf-8')
}

export async function saveNote(note: string): Promise<void> {
  let vision: VisionResponse | null = null
  let generatedAt = ''
  try {
    const content = fs.readFileSync(VISION_PATH, 'utf-8')
    vision = extractJsonFromVisionSection(content)
    const m = content.match(/generatedAt:\s*(.+)/)
    generatedAt = m ? m[1].trim() : ''
  } catch {
    // no existing file — just write note
  }
  fs.mkdirSync(path.dirname(VISION_PATH), { recursive: true })
  if (vision) {
    fs.writeFileSync(VISION_PATH, serializeVisionFile(vision, note, generatedAt), 'utf-8')
  } else {
    // No vision yet — write a skeleton file with just the note
    const skeleton = `---
generatedAt: ${generatedAt}
---

## Vision IA

## Note Jonathan

${note}
`
    fs.writeFileSync(VISION_PATH, skeleton, 'utf-8')
  }
}
```

- [ ] **Step 4: Lancer les tests**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx vitest run lib/vision.test.ts
```

Expected: tous les tests PASS.

- [ ] **Step 5: Vérifier TypeScript**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 6: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent
git add dashboard/lib/vision.ts dashboard/lib/vision.test.ts
git commit -m "feat(strategy-memory): add vision.ts with pure helpers and IO + tests"
```

---

## Task 3b: Exporter `readIdeasSummaryFull()` depuis `generate-strategy.ts`

> **Pourquoi ici :** `generate-vision.ts` (Task 4) importe cette fonction. Elle doit exister avant d'être importée pour que TypeScript compile. L'injection de la vision dans le prompt de `generateStrategyPlan()` sera faite en Task 9.

**Files:**
- Modify: `dashboard/lib/generate-strategy.ts`

- [ ] **Step 1: Ajouter `readIdeasSummaryFull()` dans `generate-strategy.ts`, juste après `readIdeasSummary()`**

```ts
export async function readIdeasSummaryFull(): Promise<string> {
  const ideas = listIdeas().slice(0, 100)
  if (ideas.length === 0) return 'Aucune idée dans le backlog.'
  const lines = ideas.map(i => `- "${i.sujet}" [${i.pilier}] (${i.statut})`).join('\n')
  return `Idées existantes (${ideas.length}) :\n${lines}`
}
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 3: Lancer les tests**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx vitest run
```

Expected: tous les tests PASS.

- [ ] **Step 4: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent
git add dashboard/lib/generate-strategy.ts
git commit -m "feat(strategy-memory): export readIdeasSummaryFull() from generate-strategy"
```

---

## Task 4: Créer `dashboard/lib/generate-vision.ts`

**Files:**
- Create: `dashboard/lib/generate-vision.ts`

- [ ] **Step 1: Créer `dashboard/lib/generate-vision.ts`**

```ts
import fs from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { CMO_SYSTEM_PROMPT } from './prompts'
import { readFullGenerationLog } from './generation-log'
import { readIdeasSummaryFull } from './generate-strategy'
import { readVision } from './vision'
import type { VisionResponse } from './types'

const CMO_BASE = process.env.CMO_BASE ?? '/Users/jonathanbraun/cmo-agent'
const CLAUDE_MD_PATH = path.join(CMO_BASE, 'CLAUDE.md')

const client = new Anthropic()

export async function generateVision(): Promise<VisionResponse> {
  const claudeMd = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8')
  const [fullLog, ideasSummary, visionData] = await Promise.all([
    readFullGenerationLog(),
    readIdeasSummaryFull(),
    readVision(),
  ])

  const noteSection = visionData.noteJonathan
    ? `\n## Note/contexte de Jonathan\n\n${visionData.noteJonathan}\n`
    : ''

  const userPrompt = `Tu es le stratège éditorial de Jonathan BRAUN. Analyse les données suivantes et génère une vision stratégique structurée.

## Profil complet (CLAUDE.md)

${claudeMd}

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

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  try {
    return JSON.parse(text) as VisionResponse
  } catch {
    throw new Error(`Claude returned non-JSON response: ${text.slice(0, 300)}`)
  }
}
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx tsc --noEmit
```

Expected: aucune erreur. (`readIdeasSummaryFull` a été exportée en Task 3b.)

- [ ] **Step 3: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent
git add dashboard/lib/generate-vision.ts
git commit -m "feat(strategy-memory): add generate-vision.ts — Claude call for VisionResponse"
```

---

## Task 5: Créer les routes API `generate-vision` et `save-note`

**Files:**
- Create: `dashboard/app/api/strategy/generate-vision/route.ts`
- Create: `dashboard/app/api/strategy/save-note/route.ts`

- [ ] **Step 1: Créer `dashboard/app/api/strategy/generate-vision/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { generateVision } from '@/lib/generate-vision'
import { saveVision, readVision } from '@/lib/vision'

export async function POST() {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const vision = await generateVision()
    await saveVision(vision, today)
    const visionData = await readVision()
    return NextResponse.json(visionData)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Créer `dashboard/app/api/strategy/save-note/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { saveNote } from '@/lib/vision'

export async function POST(req: Request) {
  try {
    const body = await req.json() as { note: string }
    if (typeof body.note !== 'string') {
      return NextResponse.json({ error: 'note must be a string' }, { status: 400 })
    }
    await saveNote(body.note)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 3: Vérifier TypeScript**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 4: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent
git add dashboard/app/api/strategy/generate-vision/route.ts dashboard/app/api/strategy/save-note/route.ts
git commit -m "feat(strategy-memory): add API routes generate-vision and save-note"
```

---

## Task 6: Créer `content/strategy/vision.md` (fichier initial vide)

**Files:**
- Create: `content/strategy/vision.md`

- [ ] **Step 1: Créer le fichier initial**

```
content/strategy/vision.md
```

Contenu exact :

```markdown
---
generatedAt:
---

## Vision IA

## Note Jonathan

```

- [ ] **Step 2: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent
git add content/strategy/vision.md
git commit -m "feat(strategy-memory): add initial empty vision.md"
```

---

## Task 7: Créer `dashboard/components/StrategyFoundation.tsx`

**Files:**
- Create: `dashboard/components/StrategyFoundation.tsx`

Ce composant est un **server component** (pas de `'use client'`). Il reçoit `CLAUDEMdSections` en props et les affiche en sections distinctes.

- [ ] **Step 1: Créer `dashboard/components/StrategyFoundation.tsx`**

```tsx
import type { CLAUDEMdSections } from '@/lib/types'

type Props = {
  sections: CLAUDEMdSections
}

export function StrategyFoundation({ sections }: Props) {
  return (
    <div style={{ marginBottom: '40px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px', color: '#1a1a1a' }}>
        Socle fondamental
      </h2>

      {/* Identité */}
      <div style={{ marginBottom: '24px', padding: '20px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
          Identité & Mission
        </h3>
        <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#333', whiteSpace: 'pre-wrap' }}>
          {sections.identite}
        </p>
      </div>

      {/* Convictions */}
      <div style={{ marginBottom: '24px', padding: '20px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
          Convictions
        </h3>
        <ol style={{ margin: 0, paddingLeft: '20px' }}>
          {sections.convictions.map((c, i) => (
            <li key={i} style={{ fontSize: '14px', lineHeight: 1.6, color: '#333', marginBottom: '6px' }}>
              {c}
            </li>
          ))}
        </ol>
      </div>

      {/* Piliers */}
      <div style={{ marginBottom: '24px', padding: '20px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
          Piliers thématiques
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #dee2e6' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: '#6c757d', fontWeight: 600 }}>#</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: '#6c757d', fontWeight: 600 }}>Pilier</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: '#6c757d', fontWeight: 600 }}>Angle</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: '#6c757d', fontWeight: 600 }}>%</th>
            </tr>
          </thead>
          <tbody>
            {sections.piliers.map((p) => (
              <tr key={p.num} style={{ borderBottom: '1px solid #f1f3f5' }}>
                <td style={{ padding: '6px 8px', color: '#999' }}>{p.num}</td>
                <td style={{ padding: '6px 8px', fontWeight: 500, color: '#333' }}>{p.nom}</td>
                <td style={{ padding: '6px 8px', color: '#555' }}>{p.angle}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', color: '#333', fontWeight: 500 }}>{p.frequence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Audience */}
      <div style={{ marginBottom: '24px', padding: '20px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
          Audience cible
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {sections.audience.map((a) => (
            <div key={a.type} style={{ padding: '14px', background: '#fff', borderRadius: '6px', border: '1px solid #dee2e6' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#495057', textTransform: 'capitalize', marginBottom: '8px' }}>
                Cible {a.type}
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600 }}>Douleur :</span> {a.douleur}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                <span style={{ fontWeight: 600 }}>Cherche :</span> {a.cherche}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Voix */}
      <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
          Voix & Style
        </h3>
        <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#333', whiteSpace: 'pre-wrap' }}>
          {sections.voix}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent
git add dashboard/components/StrategyFoundation.tsx
git commit -m "feat(strategy-memory): add StrategyFoundation server component"
```

---

## Task 8: Créer `dashboard/components/StrategyMemory.tsx`

**Files:**
- Create: `dashboard/components/StrategyMemory.tsx`

Client component. Reçoit `initialData: VisionData`. Gère génération et sauvegarde de note.

- [ ] **Step 1: Créer `dashboard/components/StrategyMemory.tsx`**

```tsx
'use client'

import { useState } from 'react'
import type { VisionData, VisionResponse } from '@/lib/types'

type Props = {
  initialData: VisionData
}

export function StrategyMemory({ initialData }: Props) {
  const [vision, setVision] = useState<VisionData>(initialData)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noteValue, setNoteValue] = useState(initialData.noteJonathan)
  const [noteChanged, setNoteChanged] = useState(false)

  async function handleGenerate() {
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/strategy/generate-vision', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        throw new Error(body.error ?? 'Erreur serveur')
      }
      const data = await res.json() as VisionData
      setVision(data)
      setNoteValue(data.noteJonathan)
      setNoteChanged(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleSaveNote() {
    setIsSavingNote(true)
    setError(null)
    try {
      const res = await fetch('/api/strategy/save-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteValue }),
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        throw new Error(body.error ?? 'Erreur serveur')
      }
      setNoteChanged(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsSavingNote(false)
    }
  }

  const v = vision.visionIA

  return (
    <div style={{ marginBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
            Vision stratégique
          </h2>
          {vision.generatedAt && (
            <p style={{ fontSize: '12px', color: '#999', margin: '4px 0 0' }}>
              Générée le {vision.generatedAt}
            </p>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          style={{
            padding: '8px 16px',
            background: isGenerating ? '#6c757d' : '#0d6efd',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: isGenerating ? 'not-allowed' : 'pointer',
          }}
        >
          {isGenerating ? 'Génération en cours...' : v ? 'Régénérer la vision' : 'Générer la vision'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', color: '#856404' }}>
          {error}
        </div>
      )}

      {!v ? (
        <div style={{ padding: '40px', textAlign: 'center', background: '#f8f9fa', borderRadius: '8px', border: '1px dashed #dee2e6', color: '#6c757d' }}>
          <p style={{ margin: 0, fontSize: '14px' }}>Aucune vision générée — cliquez sur &ldquo;Générer la vision&rdquo; pour commencer.</p>
        </div>
      ) : (
        <VisionDisplay vision={v} />
      )}

      {/* Note Jonathan */}
      <div style={{ marginTop: '24px', padding: '20px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
          Note / contexte Jonathan
        </h3>
        <textarea
          value={noteValue}
          onChange={(e) => {
            setNoteValue(e.target.value)
            setNoteChanged(e.target.value !== vision.noteJonathan)
          }}
          placeholder="Ajouter un contexte, une priorité, un cap pour guider la prochaine génération..."
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '12px',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
        {noteChanged && (
          <button
            onClick={handleSaveNote}
            disabled={isSavingNote}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              background: isSavingNote ? '#6c757d' : '#198754',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: isSavingNote ? 'not-allowed' : 'pointer',
            }}
          >
            {isSavingNote ? 'Sauvegarde...' : 'Sauvegarder la note'}
          </button>
        )}
      </div>
    </div>
  )
}

function VisionDisplay({ vision }: { vision: VisionResponse }) {
  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      <VisionCard title="Situation actuelle" content={vision.situationActuelle} />
      <VisionCard title="Direction recommandée" content={vision.directionRecommandee} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <VisionListCard title="Priorités" items={vision.priorites} color="#0d6efd" />
        <VisionListCard title="À éviter" items={vision.themesAEviter} color="#dc3545" />
      </div>
      <VisionCard title="Cohérence positionnement" content={vision.coherence} />
    </div>
  )
}

function VisionCard({ title, content }: { title: string; content: string }) {
  return (
    <div style={{ padding: '16px', background: '#fff', borderRadius: '8px', border: '1px solid #dee2e6' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
        {title}
      </div>
      <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: '#333' }}>{content}</p>
    </div>
  )
}

function VisionListCard({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div style={{ padding: '16px', background: '#fff', borderRadius: '8px', border: '1px solid #dee2e6' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
        {title}
      </div>
      <ul style={{ margin: 0, paddingLeft: '16px' }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: '14px', color, marginBottom: '4px' }}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent
git add dashboard/components/StrategyMemory.tsx
git commit -m "feat(strategy-memory): add StrategyMemory client component"
```

---

## Task 9: Modifier `generate-strategy.ts` — injection vision dans le prompt

> `readIdeasSummaryFull()` a déjà été ajoutée en Task 3b. Cette task se limite à importer `readVision` et injecter la vision dans le prompt de `generateStrategyPlan()`.

**Files:**
- Modify: `dashboard/lib/generate-strategy.ts`

- [ ] **Step 1: Ajouter l'import de `readVision` en haut du fichier**

Ajouter dans les imports existants :

```ts
import { readVision } from './vision'
```

- [ ] **Step 2: Modifier `generateStrategyPlan()` pour injecter la vision dans le prompt**

Dans `generateStrategyPlan()`, remplacer :

```ts
const [logSummary, ideasSummary] = await Promise.all([
  readGenerationLog(),
  readIdeasSummary(),
])
```

par :

```ts
const [logSummary, ideasSummary, visionData] = await Promise.all([
  readGenerationLog(),
  readIdeasSummary(),
  readVision(),
])
```

Puis dans `userPrompt`, ajouter le bloc suivant **après** le bloc `## Idées déjà dans le backlog` et **avant** `## Consigne` :

```ts
${visionData.visionIA ? `---

## Vision stratégique actuelle

Situation : ${visionData.visionIA.situationActuelle}
Direction : ${visionData.visionIA.directionRecommandee}
${visionData.noteJonathan ? `Note Jonathan : ${visionData.noteJonathan}` : ''}
` : ''}
```

- [ ] **Step 3: Lancer tous les tests**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx vitest run
```

Expected: tous les tests PASS.

- [ ] **Step 4: Vérifier TypeScript**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 5: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent
git add dashboard/lib/generate-strategy.ts
git commit -m "feat(strategy-memory): inject vision into strategy plan prompt"
```

---

## Task 10: Mettre à jour `dashboard/app/strategie/page.tsx`

**Files:**
- Modify: `dashboard/app/strategie/page.tsx`

La page devient un **async server component**. Elle parse CLAUDE.md côté serveur, lit la vision, et rend les 3 blocs.

- [ ] **Step 1: Remplacer tout le contenu de `dashboard/app/strategie/page.tsx`**

```tsx
import fs from 'fs'
import path from 'path'
import { Sidebar } from '@/components/Sidebar'
import { StrategyFoundation } from '@/components/StrategyFoundation'
import { StrategyMemory } from '@/components/StrategyMemory'
import { StrategyPlanner } from '@/components/StrategyPlanner'
import { readVision } from '@/lib/vision'
import type { CLAUDEMdSections } from '@/lib/types'

const CMO_BASE = process.env.CMO_BASE ?? '/Users/jonathanbraun/cmo-agent'
const CLAUDE_MD_PATH = path.join(CMO_BASE, 'CLAUDE.md')

function parseCLAUDEMd(content: string): CLAUDEMdSections {
  // ── identite ─────────────────────────────────────────────────────────────
  // Extract from "### Mission éditoriale" to next "## " H2
  const identiteMatch = content.match(/### Mission éditoriale([\s\S]*?)(?=\n## )/)?.[0] ?? ''
  const identite = identiteMatch.replace(/\*\*/g, '').trim()

  // ── convictions ───────────────────────────────────────────────────────────
  // Find "### Convictions fortes" (inside §2), extract until next H3
  const convictionsBlock = content.match(/### Convictions fortes([\s\S]*?)(?=\n### |\n## |$)/)?.[1] ?? ''
  const convictions = convictionsBlock
    .split('\n')
    .filter(l => /^\d+\./.test(l.trim()))
    .map(l => l.replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').trim())
    .filter(Boolean)

  // ── piliers ───────────────────────────────────────────────────────────────
  // Extract "## 4. PILIERS THÉMATIQUES" until next "##"
  const piliersBlock = content.match(/## 4\. PILIERS THÉMATIQUES([\s\S]*?)(?=\n## )/)?.[1] ?? ''
  const piliers = piliersBlock
    .split('\n')
    .filter(l => /^\|/.test(l) && !/^[|\s-]+$/.test(l) && !/Pilier/.test(l) && !/^---/.test(l))
    .map(l => {
      const cols = l.split('|').map(c => c.trim()).filter(Boolean)
      if (cols.length < 4) return null
      const num = parseInt(cols[0], 10)
      const nom = cols[1].replace(/\*\*/g, '')
      const angle = cols[2]
      const frequence = cols[3]
      return isNaN(num) ? null : { num, nom, angle, frequence }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)

  // ── audience ──────────────────────────────────────────────────────────────
  // Extract "## 5. AUDIENCE CIBLE" until next "##"
  const audienceBlock = content.match(/## 5\. AUDIENCE CIBLE([\s\S]*?)(?=\n## )/)?.[1] ?? ''
  const audienceTypes = ['primaire', 'secondaire', 'tertiaire'] as const
  const audience = audienceTypes.map(type => {
    const header = type === 'primaire' ? 'Cible primaire' : type === 'secondaire' ? 'Cible secondaire' : 'Cible tertiaire'
    const block = audienceBlock.match(new RegExp(`### ${header}([\\s\\S]*?)(?=\\n### |$)`))?.[1] ?? ''
    const douleur = block.match(/\*\*Douleur principale :\*\*\s*(.+)/)?.[1]?.trim() ?? ''
    const cherche = block.match(/\*\*Ce qu'ils cherchent :\*\*\s*(.+)/)?.[1]?.trim() ?? ''
    return { type, douleur, cherche }
  })

  // ── voix ──────────────────────────────────────────────────────────────────
  // Extract only "### Marqueurs de voix à utiliser" until next H3
  const voixBlock = content.match(/### Marqueurs de voix à utiliser([\s\S]*?)(?=\n### |\n## |$)/)?.[1] ?? ''
  const voix = voixBlock.replace(/\*\*/g, '').trim()

  return { identite, convictions, piliers, audience, voix }
}

export default async function StrategiePage() {
  const claudeMd = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8')
  const sections = parseCLAUDEMd(claudeMd)
  const visionData = await readVision()

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
        <StrategyFoundation sections={sections} />
        <StrategyMemory initialData={visionData} />
        <StrategyPlanner />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Inspecter `dashboard/components/StrategyPlanner.tsx` pour vérifier qu'il n'utilise pas `height: 100vh` ou `overflow` absolu**

Lire le composant et vérifier que son layout fonctionne dans un conteneur scrollable (pas de `height: 100vh` ou `position: fixed` internes). Si `StrategyPlanner` définit sa propre hauteur fixe, ajuster pour qu'il s'adapte à son conteneur parent.

- [ ] **Step 3: Vérifier TypeScript**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 4: Lancer tous les tests**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx vitest run
```

Expected: tous les tests PASS.

- [ ] **Step 6: Vérifier le build Next.js**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx next build 2>&1 | tail -20
```

Expected: build réussi sans erreurs.

- [ ] **Step 7: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent
git add dashboard/app/strategie/page.tsx
git commit -m "feat(strategy-memory): update strategie page — async server component with 3 blocs"
```

---

## Validation finale

- [ ] Lancer `npm run dev` dans `dashboard/`, ouvrir `http://localhost:3001/strategie`
- [ ] Vérifier que le Bloc Socle affiche identité, convictions, piliers, audience, voix
- [ ] Vérifier que le Bloc Vision affiche l'état vide avec le bouton "Générer la vision"
- [ ] Cliquer "Générer la vision" — attendre ~15 sec — vérifier que les 5 champs apparaissent
- [ ] Ajouter une note, cliquer "Sauvegarder" — vérifier `content/strategy/vision.md`
- [ ] Vérifier que le Bloc 3 (StrategyPlanner) fonctionne toujours normalement
