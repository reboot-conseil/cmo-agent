# CMO Dashboard v2 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/Users/jonathanbraun/cmo-agent/dashboard/` — a Next.js 15 app (port 3001) with 3-column layout: backlog idea cards → calendar grid → detail panel with Claude API content generation.

**Architecture:** Each idea lives as a frontmatter+markdown file in `content/ideas/<slug>.md`. `lib/parse-ideas.ts` handles all idea file I/O. `lib/calendar-sync.ts` regenerates `content/calendar.md` from idea files whenever planning changes. Claude API (`claude-sonnet-4-6`) generates hook + texte + visuel + hashtags from raw idea. UI is 3 client-rendered columns sharing `IdeaContext` for drag-and-drop and selection state.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind v4 (tokens from dashboard-chef-projet), Vitest, Anthropic SDK (`@anthropic-ai/sdk`)

**CMO_BASE:** `/Users/jonathanbraun/cmo-agent`

---

## File Map

| File | Responsibility |
|------|---------------|
| `dashboard/package.json` | deps + scripts |
| `dashboard/tsconfig.json` | TS config with @/* alias |
| `dashboard/next.config.ts` | minimal |
| `dashboard/postcss.config.mjs` | Tailwind v4 |
| `dashboard/vitest.config.ts` | vitest + jsdom |
| `dashboard/vitest.setup.ts` | jest-dom |
| `dashboard/app/globals.css` | design tokens (Professional Blue) |
| `dashboard/app/layout.tsx` | HTML shell |
| `dashboard/lib/types.ts` | all shared TS types |
| `dashboard/lib/parse-ideas.ts` | read/write `content/ideas/*.md` |
| `dashboard/lib/parse-ideas.test.ts` | vitest for parse-ideas |
| `dashboard/lib/calendar-sync.ts` | regenerate `content/calendar.md` from ideas |
| `dashboard/lib/calendar-sync.test.ts` | vitest for calendar-sync |
| `dashboard/lib/generate.ts` | Claude API call |
| `dashboard/app/api/ideas/route.ts` | GET list + POST create |
| `dashboard/app/api/ideas/[slug]/route.ts` | PATCH update |
| `dashboard/app/api/generate/route.ts` | POST → Claude API |
| `dashboard/app/api/calendar/route.ts` | GET calendar entries |
| `dashboard/app/api/performance/route.ts` | GET/POST performance-log.md entries |
| `dashboard/context/IdeaContext.tsx` | client context: selected idea, drag state |
| `dashboard/components/Sidebar.tsx` | nav sidebar |
| `dashboard/components/IdeaCard.tsx` | draggable idea card |
| `dashboard/components/BacklogPanel.tsx` | left column: filtered cards list |
| `dashboard/components/CalendarGrid.tsx` | centre: week/day slots, drop zones |
| `dashboard/components/DetailPanel.tsx` | right: full content + planification |
| `dashboard/app/page.tsx` | server component: load data, render 3-col layout |

---

## Chunk 1: Project Setup

### Task 1: Scaffold dashboard/ with config files

**Files:** Create all config files in `/Users/jonathanbraun/cmo-agent/dashboard/`

- [ ] **Step 1: Create directory and git init**

```bash
mkdir -p /Users/jonathanbraun/cmo-agent/dashboard
cd /Users/jonathanbraun/cmo-agent/dashboard
git init
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "cmo-dashboard",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "test": "vitest",
    "test:run": "vitest run"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@anthropic-ai/sdk": "^0.36.0",
    "gray-matter": "^4.0.3",
    "lucide-react": "^0.400.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/react": "^16.0.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create next.config.ts**

```ts
import type { NextConfig } from 'next'
const nextConfig: NextConfig = {}
export default nextConfig
```

- [ ] **Step 5: Create postcss.config.mjs**

```js
export default { plugins: { '@tailwindcss/postcss': {} } }
```

- [ ] **Step 6: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: ['./vitest.setup.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
})
```

- [ ] **Step 7: Create vitest.setup.ts**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 8: Install dependencies**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npm install
```

Expected: no errors, `node_modules/` created.

- [ ] **Step 9: Create app/globals.css**

```css
@import "tailwindcss";

@theme {
  --color-background:     #F8FAFC;
  --color-surface:        #ffffff;
  --color-surface-raised: #F1F5F9;
  --color-primary:        #2563EB;
  --color-primary-hover:  #1D4ED8;
  --color-primary-light:  #EFF6FF;
  --color-accent:         #7c3aed;
  --color-accent-light:   #F5F3FF;
  --color-success:        #059669;
  --color-success-light:  #ECFDF5;
  --color-warning:        #D97706;
  --color-warning-light:  #FFFBEB;
  --color-destructive:    #DC2626;
  --color-destructive-light: #FEF2F2;
  --color-foreground:     #0F172A;
  --color-muted-foreground: #64748B;
  --color-card:           #ffffff;
  --color-muted:          #F1F5F9;
  --color-border:         #E2E8F0;
  --color-border-muted:   #EEF2F7;
  --color-ring:           #93C5FD;
  --radius-xs:  0.25rem;
  --radius-sm:  0.375rem;
  --radius-md:  0.625rem;
  --radius-lg:  0.875rem;
  --radius-xl:  1.25rem;
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.06);
  --shadow-md: 0 4px 12px 0 rgb(0 0 0 / 0.08);
}

body {
  background-color: var(--color-background);
  color: var(--color-foreground);
}

* { box-sizing: border-box; }
```

- [ ] **Step 10: Create app/layout.tsx**

```tsx
import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = { title: 'CMO Dashboard', description: 'Jonathan BRAUN — LinkedIn' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
```

- [ ] **Step 11: Create directories**

```bash
mkdir -p /Users/jonathanbraun/cmo-agent/dashboard/lib
mkdir -p /Users/jonathanbraun/cmo-agent/dashboard/components
mkdir -p /Users/jonathanbraun/cmo-agent/dashboard/context
mkdir -p /Users/jonathanbraun/cmo-agent/dashboard/app/api/ideas/\[slug\]
mkdir -p /Users/jonathanbraun/cmo-agent/dashboard/app/api/generate
mkdir -p /Users/jonathanbraun/cmo-agent/dashboard/app/api/calendar
mkdir -p /Users/jonathanbraun/cmo-agent/content/ideas
```

- [ ] **Step 12: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard
git add -A && git commit -m "chore: scaffold CMO dashboard project"
```

---

## Chunk 2: Types + Parser

### Task 2: Create lib/types.ts

**Files:** Create `dashboard/lib/types.ts`

- [ ] **Step 1: Create lib/types.ts**

```ts
export type IdeaStatus = 'raw' | 'draft' | 'ready' | 'scheduled' | 'published'
export type Format = 'Post' | 'Carrousel' | 'Article' | 'Vidéo' | 'Newsletter'
export type Jour = 'Mar' | 'Mer' | 'Jeu'

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
```

- [ ] **Step 2: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard
git add lib/types.ts && git commit -m "feat: shared TypeScript types"
```

---

### Task 3: Write failing tests for parse-ideas

**Files:** Create `dashboard/lib/parse-ideas.test.ts`

- [ ] **Step 1: Create a sample idea file for tests**

Create `/Users/jonathanbraun/cmo-agent/content/ideas/test-idea-sample.md`:

```markdown
---
slug: test-idea-sample
sujet: Pourquoi 80% des projets IA échouent
pilier: IA & Transformation
format: Post
statut: draft
semaine: 2
jour: Mar
createdAt: 2026-03-17
---

## Hook

« Ce n'est presque jamais un problème de technologie. »

## Texte

J'ai accompagné des dizaines d'organisations sur leurs projets IA.

## Visuel

**Type :** Photo authentique

Photo de Jonathan en formation, tableau blanc visible.

## Hashtags

#IntelligenceArtificielle #StratégieIA #Leadership
```

- [ ] **Step 2: Create lib/parse-ideas.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import {
  parseIdeaFile,
  serializeIdea,
  extractSection,
  parseHashtags,
  slugify,
} from './parse-ideas'
import type { Idea } from './types'

const SAMPLE_CONTENT = `---
slug: test-idea-sample
sujet: Pourquoi 80% des projets IA échouent
pilier: IA & Transformation
format: Post
statut: draft
semaine: 2
jour: Mar
createdAt: 2026-03-17
---

## Hook

« Ce n'est presque jamais un problème de technologie. »

## Texte

J'ai accompagné des dizaines d'organisations sur leurs projets IA.

## Visuel

**Type :** Photo authentique

Photo de Jonathan en formation, tableau blanc visible.

## Hashtags

#IntelligenceArtificielle #StratégieIA #Leadership
`

describe('parseIdeaFile', () => {
  it('parses frontmatter fields', () => {
    const idea = parseIdeaFile(SAMPLE_CONTENT, 'test-idea-sample')
    expect(idea.slug).toBe('test-idea-sample')
    expect(idea.sujet).toBe('Pourquoi 80% des projets IA échouent')
    expect(idea.pilier).toBe('IA & Transformation')
    expect(idea.format).toBe('Post')
    expect(idea.statut).toBe('draft')
    expect(idea.semaine).toBe(2)
    expect(idea.jour).toBe('Mar')
    expect(idea.createdAt).toBe('2026-03-17')
  })

  it('extracts hook section', () => {
    const idea = parseIdeaFile(SAMPLE_CONTENT, 'test-idea-sample')
    expect(idea.hook).toBe('« Ce n\'est presque jamais un problème de technologie. »')
  })

  it('extracts texte section', () => {
    const idea = parseIdeaFile(SAMPLE_CONTENT, 'test-idea-sample')
    expect(idea.texte).toContain('J\'ai accompagné')
  })

  it('extracts visuelType from **Type :** line', () => {
    const idea = parseIdeaFile(SAMPLE_CONTENT, 'test-idea-sample')
    expect(idea.visuelType).toBe('Photo authentique')
  })

  it('extracts visuelDescription without the **Type:** line', () => {
    const idea = parseIdeaFile(SAMPLE_CONTENT, 'test-idea-sample')
    expect(idea.visuelDescription).toContain('Photo de Jonathan')
    expect(idea.visuelDescription).not.toContain('**Type :**')
  })

  it('parses hashtags array', () => {
    const idea = parseIdeaFile(SAMPLE_CONTENT, 'test-idea-sample')
    expect(idea.hashtags).toContain('#IntelligenceArtificielle')
    expect(idea.hashtags).toContain('#StratégieIA')
    expect(idea.hashtags).toHaveLength(3)
  })

  it('handles null semaine and jour', () => {
    const content = SAMPLE_CONTENT.replace('semaine: 2', 'semaine: null').replace('jour: Mar', 'jour: null')
    const idea = parseIdeaFile(content, 'test-idea-sample')
    expect(idea.semaine).toBeNull()
    expect(idea.jour).toBeNull()
  })

  it('handles missing optional sections gracefully', () => {
    const minimal = `---
slug: minimal
sujet: Idée brute
pilier: Stratégie & Décision
format: Post
statut: raw
semaine: null
jour: null
createdAt: 2026-03-17
---
`
    const idea = parseIdeaFile(minimal, 'minimal')
    expect(idea.hook).toBe('')
    expect(idea.texte).toBe('')
    expect(idea.visuelType).toBe('')
    expect(idea.visuelDescription).toBe('')
    expect(idea.hashtags).toEqual([])
  })
})

describe('extractSection', () => {
  it('returns content between two ## headings', () => {
    const result = extractSection(SAMPLE_CONTENT, 'Hook')
    expect(result).toContain('Ce n\'est presque jamais')
  })

  it('returns empty string for missing section', () => {
    expect(extractSection(SAMPLE_CONTENT, 'Nonexistent')).toBe('')
  })
})

describe('parseHashtags', () => {
  it('splits space-separated hashtags', () => {
    expect(parseHashtags('#IA #Transformation #Leadership')).toEqual(['#IA', '#Transformation', '#Leadership'])
  })

  it('returns empty array for empty string', () => {
    expect(parseHashtags('')).toEqual([])
  })
})

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('Pourquoi les projets IA échouent')).toMatch(/^[a-z0-9-]+$/)
  })

  it('removes accents', () => {
    const result = slugify('Stratégie & Décision')
    expect(result).not.toContain('é')
  })

  it('truncates to 60 chars', () => {
    const long = 'a'.repeat(100)
    expect(slugify(long).length).toBeLessThanOrEqual(60)
  })
})

describe('serializeIdea', () => {
  it('round-trips through parse → serialize → parse', () => {
    const original = parseIdeaFile(SAMPLE_CONTENT, 'test-idea-sample')
    const serialized = serializeIdea(original)
    const reparsed = parseIdeaFile(serialized, 'test-idea-sample')
    expect(reparsed.sujet).toBe(original.sujet)
    expect(reparsed.hook).toBe(original.hook)
    expect(reparsed.hashtags).toEqual(original.hashtags)
    expect(reparsed.semaine).toBe(original.semaine)
  })
})
```

- [ ] **Step 3: Run tests — expect FAIL**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npm run test:run -- lib/parse-ideas.test.ts 2>&1 | head -10
```

Expected: FAIL — `Cannot find module './parse-ideas'`

---

### Task 4: Implement lib/parse-ideas.ts

**Files:** Create `dashboard/lib/parse-ideas.ts`

- [ ] **Step 1: Create lib/parse-ideas.ts**

```ts
import fs from 'fs'
import path from 'path'
import type { Idea, IdeaStatus, Format, Jour } from './types'

const CMO_BASE = '/Users/jonathanbraun/cmo-agent'
const IDEAS_DIR = path.join(CMO_BASE, 'content/ideas')

// ─── Slug ─────────────────────────────────────────────────────────────────────

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
}

// ─── Section extraction ───────────────────────────────────────────────────────

export function extractSection(content: string, heading: string): string {
  const lines = content.split('\n')
  let inSection = false
  const result: string[] = []

  for (const line of lines) {
    if (line.match(new RegExp(`^##\\s+${heading}\\s*$`))) {
      inSection = true
      continue
    }
    if (inSection && line.startsWith('## ')) break
    if (inSection) result.push(line)
  }

  return result.join('\n').trim()
}

// ─── Hashtags ─────────────────────────────────────────────────────────────────

export function parseHashtags(text: string): string[] {
  if (!text.trim()) return []
  return text.trim().split(/\s+/).filter(t => t.startsWith('#'))
}

// ─── Frontmatter (manual parse — no external dep needed) ─────────────────────

function parseFrontmatter(content: string): { data: Record<string, unknown>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return { data: {}, body: content }
  const data: Record<string, unknown> = {}
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const val = line.slice(colonIdx + 1).trim()
    if (val === 'null') data[key] = null
    else if (/^\d+$/.test(val)) data[key] = parseInt(val, 10)
    else data[key] = val
  }
  return { data, body: match[2] }
}

// ─── Parse idea file ──────────────────────────────────────────────────────────

export function parseIdeaFile(content: string, slug: string): Idea {
  const { data, body } = parseFrontmatter(content)

  const visuelRaw = extractSection(body, 'Visuel')
  const typeMatch = visuelRaw.match(/\*\*Type\s*:\*\*\s*(.+)/)
  const visuelType = typeMatch ? typeMatch[1].trim() : ''
  const visuelDescription = visuelRaw
    .split('\n')
    .filter(l => !l.match(/^\*\*Type\s*:\*\*/))
    .join('\n')
    .trim()

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
  }
}

// ─── Serialize idea → markdown ────────────────────────────────────────────────

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
    '---',
    '',
  ].join('\n')

  const sections: string[] = []

  if (idea.hook) sections.push(`## Hook\n\n${idea.hook}\n`)
  if (idea.texte) sections.push(`## Texte\n\n${idea.texte}\n`)

  const visuelContent = [
    idea.visuelType ? `**Type :** ${idea.visuelType}` : null,
    idea.visuelDescription || null,
  ].filter(Boolean).join('\n\n')
  if (visuelContent) sections.push(`## Visuel\n\n${visuelContent}\n`)

  if (idea.hashtags.length) sections.push(`## Hashtags\n\n${idea.hashtags.join(' ')}\n`)

  return fm + sections.join('\n')
}

// ─── File I/O ─────────────────────────────────────────────────────────────────

export function readIdea(slug: string): Idea | null {
  const filePath = path.join(IDEAS_DIR, `${slug}.md`)
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return parseIdeaFile(content, slug)
  } catch { return null }
}

export function writeIdea(idea: Idea): void {
  fs.mkdirSync(IDEAS_DIR, { recursive: true })
  fs.writeFileSync(path.join(IDEAS_DIR, `${idea.slug}.md`), serializeIdea(idea), 'utf-8')
}

export function listIdeas(): Idea[] {
  try {
    const files = fs.readdirSync(IDEAS_DIR).filter(f => f.endsWith('.md') && !f.startsWith('test-'))
    return files.map(f => {
      const content = fs.readFileSync(path.join(IDEAS_DIR, f), 'utf-8')
      return parseIdeaFile(content, f.replace('.md', ''))
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } catch { return [] }
}
```

- [ ] **Step 2: Run tests — expect PASS**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npm run test:run -- lib/parse-ideas.test.ts
```

Expected: all tests PASS (≥ 12 passing).

- [ ] **Step 3: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard
git add lib/parse-ideas.ts lib/parse-ideas.test.ts
git commit -m "feat: idea file parser with full test coverage"
```

---

### Task 5: Write failing tests + implement lib/calendar-sync.ts

**Files:** Create `dashboard/lib/calendar-sync.test.ts` + `dashboard/lib/calendar-sync.ts`

- [ ] **Step 1: Write failing tests**

Create `dashboard/lib/calendar-sync.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateCalendarMd, groupByWeek } from './calendar-sync'
import type { Idea } from './types'

const IDEAS: Idea[] = [
  { slug: 'a', sujet: 'Post A', pilier: 'IA & Transformation', format: 'Post', statut: 'scheduled',
    semaine: 1, jour: 'Mar', createdAt: '2026-03-17', hook: 'Hook A', texte: '', visuelType: '', visuelDescription: '', hashtags: [] },
  { slug: 'b', sujet: 'Post B', pilier: 'Business & ROI', format: 'Carrousel', statut: 'scheduled',
    semaine: 1, jour: 'Jeu', createdAt: '2026-03-17', hook: 'Hook B', texte: '', visuelType: '', visuelDescription: '', hashtags: [] },
  { slug: 'c', sujet: 'Post C', pilier: 'Stratégie & Décision', format: 'Post', statut: 'published',
    semaine: 2, jour: 'Mer', createdAt: '2026-03-10', hook: 'Hook C', texte: '', visuelType: '', visuelDescription: '', hashtags: [] },
]

describe('groupByWeek', () => {
  it('groups ideas by semaine', () => {
    const grouped = groupByWeek(IDEAS)
    expect(grouped.get(1)).toHaveLength(2)
    expect(grouped.get(2)).toHaveLength(1)
  })

  it('ignores unscheduled ideas (null semaine)', () => {
    const withUnscheduled = [...IDEAS, {
      ...IDEAS[0], slug: 'd', semaine: null, jour: null,
    }]
    const grouped = groupByWeek(withUnscheduled)
    const total = Array.from(grouped.values()).flat().length
    expect(total).toBe(3)
  })
})

describe('generateCalendarMd', () => {
  it('contains ## Semaine N headings', () => {
    const md = generateCalendarMd(IDEAS)
    expect(md).toContain('## Semaine 1')
    expect(md).toContain('## Semaine 2')
  })

  it('contains table rows for each planned idea', () => {
    const md = generateCalendarMd(IDEAS)
    expect(md).toContain('Post A')
    expect(md).toContain('Post B')
  })

  it('includes statut emoji', () => {
    const md = generateCalendarMd(IDEAS)
    expect(md).toContain('📤') // published
    expect(md).toContain('⬜') // scheduled (not yet published)
  })

  it('produces valid markdown table rows (5 columns)', () => {
    const md = generateCalendarMd(IDEAS)
    const tableRows = md.split('\n').filter(l => l.startsWith('| Mar') || l.startsWith('| Mer') || l.startsWith('| Jeu'))
    expect(tableRows.length).toBeGreaterThan(0)
    tableRows.forEach(row => {
      expect(row.split('|').length - 2).toBeGreaterThanOrEqual(5)
    })
  })

  it('returns valid preamble with header and legend', () => {
    const md = generateCalendarMd(IDEAS)
    expect(md).toContain('# Calendrier éditorial')
    expect(md).toContain('⬜ À créer')
    expect(md).toContain('📤 Publié')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npm run test:run -- lib/calendar-sync.test.ts 2>&1 | head -5
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement lib/calendar-sync.ts**

```ts
import fs from 'fs'
import path from 'path'
import type { Idea, Jour } from './types'

const CMO_BASE = '/Users/jonathanbraun/cmo-agent'
const CALENDAR_PATH = path.join(CMO_BASE, 'content/calendar.md')

const STATUT_EMOJI: Record<Idea['statut'], string> = {
  raw:       '⬜',
  draft:     '✏️',
  ready:     '✅',
  scheduled: '⬜',
  published: '📤',
}

const JOUR_ORDER: Jour[] = ['Mar', 'Mer', 'Jeu']

export function groupByWeek(ideas: Idea[]): Map<number, Idea[]> {
  const map = new Map<number, Idea[]>()
  for (const idea of ideas) {
    if (idea.semaine === null || idea.jour === null) continue
    const existing = map.get(idea.semaine) ?? []
    map.set(idea.semaine, [...existing, idea])
  }
  return map
}

export function generateCalendarMd(ideas: Idea[]): string {
  const grouped = groupByWeek(ideas)
  const semaines = Array.from(grouped.keys()).sort((a, b) => a - b)

  const preamble = `# Calendrier éditorial — Agent CMO

## Phase actuelle : LANCEMENT (Mois 1-2)
**Rythme : 3 posts/semaine (Mardi - Mercredi - Jeudi)**

---

## Rotation hebdomadaire type

| Jour | Pilier | Format | Objectif |
|------|--------|--------|----------|
| Mardi | IA & Transformation OU Stratégie & Décision | Post classique | Insight fort |
| Mercredi | Business & ROI OU Neurosciences & Adoption | Post ou carrousel | Valeur concrète |
| Jeudi | Coulisses OU Innovation | Post personnel | Humanisation |

---

`

  const semaineBlocks = semaines.map(semaine => {
    const sIdeas = grouped.get(semaine)!
    const ideasByJour = new Map<Jour, Idea>()
    for (const idea of sIdeas) {
      if (idea.jour) ideasByJour.set(idea.jour, idea)
    }

    const rows = JOUR_ORDER.map(jour => {
      const idea = ideasByJour.get(jour)
      if (!idea) return `| ${jour} | | | | ⬜ À créer |`
      const emoji = STATUT_EMOJI[idea.statut]
      const label = idea.statut === 'published' ? '📤 Publié' :
                    idea.statut === 'ready'     ? '✅ Validé' :
                    idea.statut === 'draft'     ? '✏️ Draft en cours' : '⬜ À créer'
      return `| ${jour} | ${idea.pilier} | ${idea.sujet} | ${idea.hook || '—'} | ${label} |`
    })

    return [
      `## Semaine ${semaine} — [EN COURS]`,
      '',
      '| Jour | Pilier | Sujet | Hook | Statut |',
      '|------|--------|-------|------|--------|',
      ...rows,
      '',
    ].join('\n')
  }).join('\n')

  const legend = `\n---\n\n## Légende statuts\n\n- ⬜ À créer\n- ✏️ Draft en cours\n- 👀 En attente de validation\n- ✅ Validé, prêt à publier\n- 📤 Publié\n`

  return preamble + semaineBlocks + legend
}

export function syncCalendarFile(ideas: Idea[]): void {
  const md = generateCalendarMd(ideas)
  fs.writeFileSync(CALENDAR_PATH, md, 'utf-8')
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npm run test:run -- lib/calendar-sync.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard
git add lib/calendar-sync.ts lib/calendar-sync.test.ts
git commit -m "feat: calendar sync — regenerate calendar.md from ideas"
```

---

### Task 6: Implement lib/generate.ts (Claude API)

**Files:** Create `dashboard/lib/generate.ts`

Note: No unit tests for this file — it calls an external API. Tested via smoke test in Task 10.

- [ ] **Step 1: Create lib/generate.ts**

```ts
import Anthropic from '@anthropic-ai/sdk'
import type { GenerateRequest, GenerateResponse } from './types'

const client = new Anthropic() // uses ANTHROPIC_API_KEY env var

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

export async function generateIdeaContent(req: GenerateRequest): Promise<GenerateResponse> {
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
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  try {
    return JSON.parse(text) as GenerateResponse
  } catch {
    throw new Error(`Claude returned non-JSON response: ${text.slice(0, 200)}`)
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard
git add lib/generate.ts && git commit -m "feat: Claude API content generation"
```

---

## Chunk 3: API Routes

### Task 7: API routes — ideas + calendar

**Files:**
- Create: `dashboard/app/api/ideas/route.ts`
- Create: `dashboard/app/api/ideas/[slug]/route.ts`
- Create: `dashboard/app/api/calendar/route.ts`

- [ ] **Step 1: Create app/api/ideas/route.ts**

```ts
import { NextResponse } from 'next/server'
import { listIdeas, writeIdea, slugify } from '@/lib/parse-ideas'
import type { Format, IdeaStatus } from '@/lib/types'

export async function GET() {
  try {
    return NextResponse.json(listIdeas())
  } catch { return NextResponse.json([]) }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { sujet: string; pilier: string; format: Format }
    if (!body.sujet?.trim()) return NextResponse.json({ error: 'sujet requis' }, { status: 400 })

    const slug = slugify(body.sujet) + '-' + Date.now().toString(36)
    const idea = {
      slug,
      sujet: body.sujet.trim(),
      pilier: body.pilier ?? 'IA & Transformation',
      format: body.format ?? 'Post' as Format,
      statut: 'raw' as IdeaStatus,
      semaine: null,
      jour: null,
      createdAt: new Date().toISOString().split('T')[0],
      hook: '',
      texte: '',
      visuelType: '',
      visuelDescription: '',
      hashtags: [],
    }
    writeIdea(idea)
    return NextResponse.json(idea, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create app/api/ideas/[slug]/route.ts**

```ts
import { NextResponse } from 'next/server'
import { readIdea, writeIdea, listIdeas } from '@/lib/parse-ideas'
import { syncCalendarFile } from '@/lib/calendar-sync'
import type { Idea } from '@/lib/types'

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const existing = readIdea(slug)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updates = await request.json() as Partial<Idea>

    // Swap: if assigning a slot already taken, unschedule the occupant
    if (updates.semaine != null && updates.jour != null) {
      const all = listIdeas()
      const occupant = all.find(i => i.slug !== slug && i.semaine === updates.semaine && i.jour === updates.jour)
      if (occupant) {
        writeIdea({ ...occupant, semaine: null, jour: null, statut: occupant.statut === 'scheduled' ? 'ready' : occupant.statut })
      }
    }

    const updated: Idea = { ...existing, ...updates }
    writeIdea(updated)

    // Regenerate calendar.md
    syncCalendarFile(listIdeas())

    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 3: Create app/api/calendar/route.ts**

```ts
import { NextResponse } from 'next/server'
import { listIdeas } from '@/lib/parse-ideas'

export async function GET() {
  try {
    const ideas = listIdeas().filter(i => i.semaine !== null)
    return NextResponse.json(ideas)
  } catch { return NextResponse.json([]) }
}
```

- [ ] **Step 4: Create app/api/performance/route.ts**

```ts
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const CMO_BASE = process.env.CMO_BASE ?? '/Users/jonathanbraun/cmo-agent'
const PERF_FILE = path.join(CMO_BASE, 'intelligence', 'performance-log.md')

export async function GET() {
  try {
    const content = fs.existsSync(PERF_FILE) ? fs.readFileSync(PERF_FILE, 'utf-8') : ''
    return NextResponse.json({ content })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { entry } = await request.json() as { entry: string }
    if (!entry?.trim()) return NextResponse.json({ error: 'entry requis' }, { status: 400 })
    fs.mkdirSync(path.dirname(PERF_FILE), { recursive: true })
    const existing = fs.existsSync(PERF_FILE) ? fs.readFileSync(PERF_FILE, 'utf-8') : ''
    fs.writeFileSync(PERF_FILE, existing + '\n' + entry.trim() + '\n', 'utf-8')
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 5: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard
git add app/api/ && git commit -m "feat: ideas, calendar, and performance API routes"
```

---

### Task 8: API route — generate

**Files:** Create `dashboard/app/api/generate/route.ts`

- [ ] **Step 1: Create app/api/generate/route.ts**

```ts
import { NextResponse } from 'next/server'
import { generateIdeaContent } from '@/lib/generate'
import { readIdea, writeIdea } from '@/lib/parse-ideas'
import type { GenerateRequest } from '@/lib/types'

export async function POST(request: Request) {
  try {
    const body = await request.json() as GenerateRequest

    if (!body.slug || !body.sujet) {
      return NextResponse.json({ error: 'slug et sujet requis' }, { status: 400 })
    }

    const generated = await generateIdeaContent(body)

    // Persist to idea file
    const existing = readIdea(body.slug)
    if (existing) {
      writeIdea({
        ...existing,
        hook: generated.hook,
        texte: generated.texte,
        visuelType: generated.visuelType,
        visuelDescription: generated.visuelDescription,
        hashtags: generated.hashtags,
        statut: existing.statut === 'raw' ? 'draft' : existing.statut,
      })
    }

    return NextResponse.json(generated)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard
git add app/api/generate/route.ts && git commit -m "feat: generate API route — Claude content generation"
```

---

## Chunk 4: UI Components

### Task 9: IdeaContext + IdeaCard + BacklogPanel

**Files:**
- Create: `dashboard/context/IdeaContext.tsx`
- Create: `dashboard/components/IdeaCard.tsx`
- Create: `dashboard/components/BacklogPanel.tsx`

- [ ] **Step 1: Create context/IdeaContext.tsx**

```tsx
'use client'
import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Idea } from '@/lib/types'

type IdeaContextType = {
  selectedIdea: Idea | null
  setSelectedIdea: (idea: Idea | null) => void
  draggingSlug: string | null
  setDraggingSlug: (slug: string | null) => void
}

const IdeaContext = createContext<IdeaContextType | null>(null)

export function IdeaProvider({ children }: { children: ReactNode }) {
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null)
  const [draggingSlug, setDraggingSlug] = useState<string | null>(null)
  return (
    <IdeaContext.Provider value={{ selectedIdea, setSelectedIdea, draggingSlug, setDraggingSlug }}>
      {children}
    </IdeaContext.Provider>
  )
}

export function useIdea() {
  const ctx = useContext(IdeaContext)
  if (!ctx) throw new Error('useIdea must be inside IdeaProvider')
  return ctx
}
```

- [ ] **Step 2: Create components/IdeaCard.tsx**

```tsx
'use client'
import { useIdea } from '@/context/IdeaContext'
import type { Idea } from '@/lib/types'

const PILIER_COLORS: Record<string, string> = {
  'IA & Transformation':    '#2563EB',
  'Stratégie & Décision':   '#7c3aed',
  'Business & ROI':         '#059669',
  'Neurosciences & Adoption': '#D97706',
  'Innovation & Prospective': '#0891b2',
  'Coulisses & Authenticité': '#db2777',
}

const FORMAT_STYLES: Record<string, { bg: string; color: string }> = {
  'Post':      { bg: '#EFF6FF', color: '#2563EB' },
  'Carrousel': { bg: '#F5F3FF', color: '#7c3aed' },
  'Article':   { bg: '#ECFDF5', color: '#059669' },
  'Vidéo':     { bg: '#FEF2F2', color: '#DC2626' },
  'Newsletter':{ bg: '#FFF7ED', color: '#C2410C' },
}

const STATUT_LABEL: Record<Idea['statut'], string> = {
  raw: '○ Brute', draft: '✏ Draft', ready: '✓ Prête',
  scheduled: '📅 Planifiée', published: '📤 Publiée',
}

export function IdeaCard({ idea }: { idea: Idea }) {
  const { selectedIdea, setSelectedIdea, setDraggingSlug } = useIdea()
  const isSelected = selectedIdea?.slug === idea.slug
  const dotColor = PILIER_COLORS[idea.pilier] ?? '#64748B'
  const fmt = FORMAT_STYLES[idea.format] ?? FORMAT_STYLES['Post']

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', idea.slug)
    setDraggingSlug(idea.slug)
  }
  const handleDragEnd = () => setDraggingSlug(null)

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => setSelectedIdea(isSelected ? null : idea)}
      style={{
        background: 'var(--color-surface)',
        border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
        boxShadow: isSelected ? '0 0 0 3px rgba(37,99,235,0.12)' : undefined,
        borderRadius: 'var(--radius-lg)',
        padding: '12px 14px',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0, marginTop: 5 }} />
        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-foreground)', lineHeight: 1.4, flex: 1 }}>
          {idea.sujet}
        </span>
      </div>

      {/* Preview */}
      {idea.texte && (
        <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', lineHeight: 1.5, marginBottom: 8,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {idea.hook || idea.texte}
        </p>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.04em', background: fmt.bg, color: fmt.color }}>
          {idea.format}
        </span>
        {idea.visuelType && (
          <span style={{ fontSize: 10, color: 'var(--color-muted-foreground)', background: 'var(--color-muted)',
            padding: '2px 6px', borderRadius: 4 }}>
            🖼 {idea.visuelType}
          </span>
        )}
        <span style={{ fontSize: 10, color: 'var(--color-muted-foreground)', marginLeft: 'auto' }}>
          {STATUT_LABEL[idea.statut]}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create components/BacklogPanel.tsx**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IdeaCard } from './IdeaCard'
import type { Idea, Format } from '@/lib/types'

const FORMATS: Format[] = ['Post', 'Carrousel', 'Article', 'Vidéo', 'Newsletter']
const SECTIONS: { key: string; label: string; types: Format[] }[] = [
  { key: 'posts', label: 'Posts terrain', types: ['Post'] },
  { key: 'carousels', label: 'Carrousels', types: ['Carrousel'] },
  { key: 'articles', label: 'Articles', types: ['Article'] },
  { key: 'videos', label: 'Vidéos', types: ['Vidéo', 'Newsletter'] },
]

export function BacklogPanel({ ideas }: { ideas: Idea[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<Format | 'Tous'>('Tous')
  const [adding, setAdding] = useState(false)
  const [newIdea, setNewIdea] = useState({ sujet: '', pilier: 'IA & Transformation', format: 'Post' as Format })

  const unscheduled = ideas.filter(i => i.semaine === null && i.statut !== 'published')
  const filtered = filter === 'Tous' ? unscheduled : unscheduled.filter(i => i.format === filter)

  const handleAdd = async () => {
    if (!newIdea.sujet.trim()) return
    await fetch('/api/ideas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newIdea) })
    setNewIdea({ sujet: '', pilier: 'IA & Transformation', format: 'Post' })
    setAdding(false)
    router.refresh()
  }

  return (
    <div style={{ width: 340, minWidth: 340, background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 10px', borderBottom: '1px solid var(--color-border-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Idées</span>
        <span style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)', fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 99 }}>{unscheduled.length}</span>
        <button onClick={() => setAdding(v => !v)} style={{ marginLeft: 'auto', padding: '4px 10px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
          {adding ? '✕' : '+ Ajouter'}
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border-muted)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input value={newIdea.sujet} onChange={e => setNewIdea(v => ({ ...v, sujet: e.target.value }))}
            placeholder="Idée brute..." style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 13 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <select value={newIdea.pilier} onChange={e => setNewIdea(v => ({ ...v, pilier: e.target.value }))}
              style={{ flex: 1, padding: '5px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 12 }}>
              {['IA & Transformation','Stratégie & Décision','Business & ROI','Neurosciences & Adoption','Innovation & Prospective','Coulisses & Authenticité'].map(p => <option key={p}>{p}</option>)}
            </select>
            <select value={newIdea.format} onChange={e => setNewIdea(v => ({ ...v, format: e.target.value as Format }))}
              style={{ width: 90, padding: '5px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 12 }}>
              {FORMATS.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <button onClick={handleAdd} style={{ padding: '6px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 12, cursor: 'pointer' }}>Créer l'idée</button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', padding: '8px 16px', gap: 4, borderBottom: '1px solid var(--color-border-muted)', flexWrap: 'wrap' }}>
        {(['Tous', ...FORMATS] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
              background: filter === f ? 'var(--color-primary-light)' : 'transparent',
              color: filter === f ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }}>
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 && (
          <p style={{ color: 'var(--color-muted-foreground)', fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginTop: 24 }}>
            Aucune idée dans cette catégorie.
          </p>
        )}
        {(filter === 'Tous' ? SECTIONS : [{ key: 'filtered', label: filter, types: [filter as Format] }]).map(section => {
          const sectionIdeas = filtered.filter(i => section.types.includes(i.format))
          if (sectionIdeas.length === 0) return null
          return (
            <div key={section.key}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 2px', marginBottom: 4 }}>
                {section.label}
              </div>
              {sectionIdeas.map(idea => <IdeaCard key={idea.slug} idea={idea} />)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard
git add context/ components/IdeaCard.tsx components/BacklogPanel.tsx
git commit -m "feat: IdeaContext, IdeaCard, BacklogPanel"
```

---

### Task 10: CalendarGrid component

**Files:** Create `dashboard/components/CalendarGrid.tsx`

- [ ] **Step 1: Create components/CalendarGrid.tsx**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useIdea } from '@/context/IdeaContext'
import type { Idea, Jour } from '@/lib/types'

const JOURS: Jour[] = ['Mar', 'Mer', 'Jeu']
const MAX_SEMAINES = 5

const PILIER_COLORS: Record<string, string> = {
  'IA & Transformation':    '#2563EB',
  'Stratégie & Décision':   '#7c3aed',
  'Business & ROI':         '#059669',
  'Neurosciences & Adoption': '#D97706',
  'Innovation & Prospective': '#0891b2',
  'Coulisses & Authenticité': '#db2777',
}

const STATUT_BADGE: Record<Idea['statut'], { label: string; bg: string; color: string }> = {
  raw:       { label: '○ Brute',    bg: '#F1F5F9', color: '#64748B' },
  draft:     { label: '✏️ Draft',   bg: '#EFF6FF', color: '#2563EB' },
  ready:     { label: '✓ Prête',    bg: '#ECFDF5', color: '#059669' },
  scheduled: { label: '⬜ À créer', bg: '#F1F5F9', color: '#64748B' },
  published: { label: '📤 Publié',  bg: '#F5F3FF', color: '#7c3aed' },
}

export function CalendarGrid({ ideas }: { ideas: Idea[] }) {
  const router = useRouter()
  const { setSelectedIdea, draggingSlug } = useIdea()
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null)

  const scheduledIdeas = ideas.filter(i => i.semaine !== null)
  const kpi = {
    planifiés: ideas.filter(i => ['scheduled', 'draft', 'ready'].includes(i.statut) && i.semaine !== null).length,
    aValider:  ideas.filter(i => i.statut === 'ready').length,
    publiés:   ideas.filter(i => i.statut === 'published').length,
  }

  function getIdea(semaine: number, jour: Jour): Idea | null {
    return scheduledIdeas.find(i => i.semaine === semaine && i.jour === jour) ?? null
  }

  async function handleDrop(e: React.DragEvent, semaine: number, jour: Jour) {
    e.preventDefault()
    setDragOverSlot(null)
    const slug = e.dataTransfer.getData('text/plain')
    if (!slug) return
    await fetch(`/api/ideas/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ semaine, jour, statut: 'scheduled' }),
    })
    router.refresh()
  }

  const slotKey = (s: number, j: Jour) => `${s}-${j}`

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header with KPIs */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--color-border-muted)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Calendrier</span>
        <div style={{ display: 'flex', gap: 16, marginLeft: 'auto' }}>
          {[
            { label: 'Planifiés', val: kpi.planifiés, color: 'var(--color-primary)' },
            { label: 'À valider', val: kpi.aValider, color: 'var(--color-warning)' },
            { label: 'Publiés',   val: kpi.publiés,  color: 'var(--color-success)' },
          ].map(k => (
            <div key={k.label} style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: k.color, lineHeight: 1 }}>{k.val}</div>
              <div style={{ fontSize: 10, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {/* Day headers */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, paddingLeft: 72 }}>
          {JOURS.map(j => (
            <div key={j} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{j}</div>
          ))}
        </div>

        {Array.from({ length: MAX_SEMAINES }, (_, i) => i + 1).map(semaine => (
          <div key={semaine} style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-start' }}>
            {/* Week label */}
            <div style={{ width: 64, minWidth: 64, paddingTop: 10, fontSize: 11, fontWeight: 600, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Sem. {semaine}
            </div>
            {/* Day slots */}
            {JOURS.map(jour => {
              const idea = getIdea(semaine, jour)
              const key = slotKey(semaine, jour)
              const isDragOver = dragOverSlot === key
              const pilierColor = idea ? (PILIER_COLORS[idea.pilier] ?? '#64748B') : undefined
              const badge = idea ? STATUT_BADGE[idea.statut] : null

              return (
                <div key={jour} style={{ flex: 1 }}
                  onDragOver={e => { e.preventDefault(); setDragOverSlot(key) }}
                  onDragLeave={() => setDragOverSlot(null)}
                  onDrop={e => handleDrop(e, semaine, jour)}>
                  <div
                    onClick={() => idea && setSelectedIdea(idea)}
                    style={{
                      minHeight: 80, borderRadius: 'var(--radius-md)', padding: 8,
                      border: `1.5px ${idea ? 'solid' : 'dashed'} ${isDragOver ? 'var(--color-primary)' : idea ? 'var(--color-border)' : 'var(--color-border)'}`,
                      background: isDragOver ? 'var(--color-primary-light)' : 'var(--color-surface)',
                      cursor: idea ? 'pointer' : 'default',
                      display: 'flex', flexDirection: 'column',
                      alignItems: idea ? 'flex-start' : 'center',
                      justifyContent: idea ? 'flex-start' : 'center',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}>
                    {idea ? (
                      <>
                        <div style={{ height: 3, width: '100%', background: pilierColor, borderRadius: 2, marginBottom: 6 }} />
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-foreground)', lineHeight: 1.35, marginBottom: 4 }}>
                          {idea.sujet.length > 50 ? idea.sujet.slice(0, 50) + '…' : idea.sujet}
                        </div>
                        {badge && (
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 500, background: badge.bg, color: badge.color }}>
                            {badge.label}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: 18, opacity: 0.25, marginBottom: 2 }}>＋</span>
                        <span style={{ fontSize: 10, opacity: 0.5 }}>Déposer</span>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard
git add components/CalendarGrid.tsx && git commit -m "feat: CalendarGrid with drag-and-drop slots"
```

---

### Task 11: DetailPanel component

**Files:** Create `dashboard/components/DetailPanel.tsx`

- [ ] **Step 1: Create components/DetailPanel.tsx**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useIdea } from '@/context/IdeaContext'
import type { Idea, Jour } from '@/lib/types'

const JOURS: Jour[] = ['Mar', 'Mer', 'Jeu']
const MAX_SEMAINES = 5

const PILIER_STYLES: Record<string, { bg: string; color: string }> = {
  'IA & Transformation':    { bg: '#EFF6FF', color: '#2563EB' },
  'Stratégie & Décision':   { bg: '#F5F3FF', color: '#7c3aed' },
  'Business & ROI':         { bg: '#ECFDF5', color: '#059669' },
  'Neurosciences & Adoption': { bg: '#FFFBEB', color: '#D97706' },
  'Innovation & Prospective': { bg: '#F0F9FF', color: '#0891b2' },
  'Coulisses & Authenticité': { bg: '#FDF2F8', color: '#db2777' },
}

export function DetailPanel({ allIdeas }: { allIdeas: Idea[] }) {
  const router = useRouter()
  const { selectedIdea, setSelectedIdea } = useIdea()
  const [editing, setEditing] = useState(false)
  const [texte, setTexte] = useState('')
  const [generating, setGenerating] = useState(false)
  const [direction, setDirection] = useState('')
  const [showDirection, setShowDirection] = useState(false)

  if (!selectedIdea) {
    return (
      <div style={{ width: 380, minWidth: 380, background: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', fontStyle: 'italic' }}>
          Sélectionne une idée pour voir le détail
        </p>
      </div>
    )
  }

  const idea = selectedIdea
  const pStyle = PILIER_STYLES[idea.pilier] ?? { bg: '#F1F5F9', color: '#64748B' }

  const handlePlan = async (semaine: number, jour: Jour) => {
    await fetch(`/api/ideas/${idea.slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ semaine, jour, statut: 'scheduled' }),
    })
    router.refresh()
    setSelectedIdea(null)
  }

  const handleSaveTexte = async () => {
    await fetch(`/api/ideas/${idea.slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texte }),
    })
    setEditing(false)
    router.refresh()
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: idea.slug, sujet: idea.sujet, pilier: idea.pilier, format: idea.format, direction }),
      })
      setDirection('')
      setShowDirection(false)
      router.refresh()
    } finally {
      setGenerating(false)
    }
  }

  // Available slots (not occupied)
  const occupiedKeys = new Set(allIdeas.filter(i => i.semaine !== null && i.slug !== idea.slug).map(i => `${i.semaine}-${i.jour}`))
  const availableSlots = Array.from({ length: MAX_SEMAINES }, (_, i) => i + 1).flatMap(s => JOURS.map(j => ({ semaine: s, jour: j }))).filter(({ semaine, jour }) => !occupiedKeys.has(`${semaine}-${jour}`))

  return (
    <div style={{ width: 380, minWidth: 380, background: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--color-border-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: pStyle.bg, color: pStyle.color }}>{idea.pilier}</span>
              <span style={{ padding: '3px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>{idea.format}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-foreground)', lineHeight: 1.4 }}>{idea.sujet}</div>
            {idea.hook && <div style={{ fontSize: 13, color: 'var(--color-primary)', fontStyle: 'italic', marginTop: 4 }}>{idea.hook}</div>}
          </div>
          <button onClick={() => setSelectedIdea(null)} style={{ padding: '4px 6px', background: 'transparent', border: 'none', color: 'var(--color-muted-foreground)', cursor: 'pointer', fontSize: 16, borderRadius: 4, flexShrink: 0 }}>✕</button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

        {/* Texte */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Texte du post</div>
          {editing ? (
            <div>
              <textarea value={texte} onChange={e => setTexte(e.target.value)} rows={8}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 13, lineHeight: 1.6, resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button onClick={handleSaveTexte} style={{ flex: 1, padding: '6px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 12, cursor: 'pointer' }}>Sauvegarder</button>
                <button onClick={() => setEditing(false)} style={{ padding: '6px 10px', background: 'var(--color-muted)', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 12, cursor: 'pointer' }}>Annuler</button>
              </div>
            </div>
          ) : idea.texte ? (
            <div style={{ background: 'var(--color-muted)', borderRadius: 'var(--radius-md)', padding: '12px 14px', fontSize: 13, color: 'var(--color-foreground)', lineHeight: 1.65 }}>
              {idea.texte.split('\n').map((p, i) => p.trim() && <p key={i} style={{ marginBottom: 8 }}>{p}</p>)}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', fontStyle: 'italic' }}>
              Pas encore de texte — cliquez sur "Générer" pour créer le contenu.
            </p>
          )}
        </div>

        {/* Visuel */}
        {(idea.visuelType || idea.visuelDescription) && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Visuel</div>
            <div style={{ background: 'var(--color-muted)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
              {idea.visuelType && <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>🖼 {idea.visuelType}</div>}
              {idea.visuelDescription && <div style={{ fontSize: 12, color: 'var(--color-foreground)', lineHeight: 1.6, fontStyle: 'italic' }}>{idea.visuelDescription}</div>}
            </div>
          </div>
        )}

        {/* Hashtags */}
        {idea.hashtags.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Hashtags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {idea.hashtags.map(h => (
                <span key={h} style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 500 }}>{h}</span>
              ))}
            </div>
          </div>
        )}

        {/* Planifier */}
        {idea.semaine === null && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Planifier</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {availableSlots.slice(0, 6).map(({ semaine, jour }) => (
                <div key={`${semaine}-${jour}`} onClick={() => handlePlan(semaine, jour)}
                  style={{ background: 'var(--color-muted)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}>
                  <div style={{ fontSize: 10, color: 'var(--color-muted-foreground)', marginBottom: 2 }}>SEM. {semaine}</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{jour}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Direction pour régénération */}
        {showDirection && (
          <div style={{ marginBottom: 12 }}>
            <textarea value={direction} onChange={e => setDirection(e.target.value)}
              placeholder="Direction optionnelle : angle plus personnel, insister sur le ROI, public dirigeants PME..."
              rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 12, resize: 'vertical' }} />
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border-muted)', display: 'flex', gap: 6 }}>
        <button onClick={() => { setEditing(true); setTexte(idea.texte) }}
          style={{ flex: 1, padding: '8px', background: 'var(--color-muted)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
          ✏️ Modifier
        </button>
        <button onClick={() => setShowDirection(v => !v)} disabled={generating}
          style={{ flex: 1, padding: '8px', background: 'var(--color-accent-light)', color: 'var(--color-accent)', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
          {generating ? '⏳ Génération...' : '✨ Générer'}
        </button>
        {showDirection && (
          <button onClick={handleGenerate} disabled={generating}
            style={{ padding: '8px 12px', background: 'var(--color-accent)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
            →
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard
git add components/DetailPanel.tsx && git commit -m "feat: DetailPanel with generation, edit, and planning"
```

---

### Task 12: Sidebar + app/page.tsx — wire everything

**Files:**
- Create: `dashboard/components/Sidebar.tsx`
- Create: `dashboard/app/page.tsx`

- [ ] **Step 1: Create components/Sidebar.tsx**

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/', label: 'Planification', icon: '⊞' },
  { href: '/performances', label: 'Performances', icon: '↑' },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <nav style={{ width: 200, minWidth: 200, background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', padding: '16px 0' }}>
      <div style={{ padding: '4px 20px 20px', fontWeight: 700, fontSize: 15, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>✦</span> CMO Agent
      </div>
      {NAV.map(item => (
        <Link key={item.href} href={item.href}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 20px', fontSize: 13, fontWeight: 500, textDecoration: 'none',
            background: pathname === item.href ? 'var(--color-primary-light)' : 'transparent',
            color: pathname === item.href ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }}>
          <span>{item.icon}</span>{item.label}
        </Link>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Create app/page.tsx** (server component — fetches data, wraps in client providers)

```tsx
import { listIdeas } from '@/lib/parse-ideas'
import { IdeaProvider } from '@/context/IdeaContext'
import { Sidebar } from '@/components/Sidebar'
import { BacklogPanel } from '@/components/BacklogPanel'
import { CalendarGrid } from '@/components/CalendarGrid'
import { DetailPanel } from '@/components/DetailPanel'

export default function Page() {
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

- [ ] **Step 3: Run full test suite**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npm run test:run
```

Expected: all tests pass.

- [ ] **Step 4: Build check**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npm run build 2>&1 | tail -20
```

Fix any TypeScript errors before proceeding.

- [ ] **Step 5: Smoke test — start dev server**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && ANTHROPIC_API_KEY=<your-key> npm run dev
```

Open `http://localhost:3001`:
- Backlog shows existing ideas from `content/ideas/`
- Calendar shows planned ideas
- Clicking an idea opens the detail panel
- "Générer" calls Claude API and updates the card

- [ ] **Step 6: Final commit**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard
git add -A && git commit -m "feat: CMO Dashboard v2 — full 3-column layout complete"
```

---

## Acceptance Checklist

- [ ] `npm run test:run` — all tests pass
- [ ] `npm run build` — no TypeScript errors
- [ ] Backlog shows idea cards with sujet, texte preview, format badge, visuelType
- [ ] Filter tabs (Tous / Post / Carrousel / Article / Vidéo) work
- [ ] "Ajouter" form creates a `raw` idea file in `content/ideas/`
- [ ] Drag card from backlog → drop on calendar slot → idea assigned (PATCH + router.refresh)
- [ ] Swap: dragging onto occupied slot unschedules previous occupant
- [ ] Click card or slot → detail panel opens
- [ ] Detail panel shows texte, visuel description, hashtags
- [ ] "Planifier" grid shows available slots; clicking one assigns the idea
- [ ] "Générer" calls Claude API, writes hook+texte+visuel to idea file, refreshes UI
- [ ] Direction textarea guides regeneration
- [ ] "Modifier" inline textarea saves updated texte
- [ ] `content/calendar.md` is regenerated after every planning change
- [ ] `content/ideas/*.md` persist correctly after create/update
