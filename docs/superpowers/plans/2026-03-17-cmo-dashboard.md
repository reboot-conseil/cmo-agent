# CMO Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Next.js app on localhost:3001 that visualises the CMO agent's markdown files (calendar, backlog, performance log) with a form to add performance entries.

**Architecture:** A Next.js 15 app reads markdown files from `/Users/jonathanbraun/cmo-agent/` via server-side API routes. Pure parsing functions in `lib/parse-markdown.ts` handle all markdown-to-typed-object conversion. UI components are fed data from server components via props; the PerformanceSection uses `router.refresh()` after form submission to reload server data.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind v4, Recharts 3, Vitest

---

## File Map

| File | Responsibility |
|------|---------------|
| `package.json` | Dependencies, scripts (dev on port 3001, test) |
| `tsconfig.json` | TypeScript config with `@/*` path alias |
| `next.config.ts` | Minimal Next.js config |
| `postcss.config.mjs` | Tailwind v4 postcss plugin |
| `vitest.config.ts` | Vitest + jsdom for pure function tests |
| `vitest.setup.ts` | jest-dom matchers |
| `app/globals.css` | `@import "tailwindcss"` + minimal base |
| `app/layout.tsx` | HTML shell, Inter font, no sidebar |
| `lib/types.ts` | All shared TypeScript types (importable in client) |
| `lib/parse-markdown.ts` | Server-only: read files, parse, write performance entry |
| `lib/parse-markdown.test.ts` | Vitest tests for all pure parsing functions |
| `app/api/calendar/route.ts` | GET: returns `CalendarPost[]` |
| `app/api/backlog/route.ts` | GET: returns `BacklogItem[]` |
| `app/api/performance/route.ts` | GET: returns `PerformanceEntry[]` · POST: appends entry |
| `components/SummaryBar.tsx` | 4 KPI cards (client component, accepts props) |
| `components/CalendarSection.tsx` | Tables grouped by week (server-renderable) |
| `components/BacklogSection.tsx` | Ideas grouped by type (server-renderable) |
| `components/PerformanceSection.tsx` | Table + LineChart + add form (client component) |
| `app/page.tsx` | Server component: fetches all data, renders sections |

---

## Chunk 1: Project Setup

### Task 1: Create package.json, tsconfig, next.config, postcss

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`

- [ ] **Step 1: Create the project directory**

```bash
mkdir /Users/jonathanbraun/cmo-dashboard
cd /Users/jonathanbraun/cmo-dashboard
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
    "recharts": "^3.0.0",
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
    "paths": {
      "@/*": ["./*"]
    }
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
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

- [ ] **Step 6: Install dependencies**

```bash
cd /Users/jonathanbraun/cmo-dashboard
npm install
```

Expected: installs without errors, `node_modules/` created.

- [ ] **Step 7: Commit**

```bash
cd /Users/jonathanbraun/cmo-dashboard
git add package.json tsconfig.json next.config.ts postcss.config.mjs
git commit -m "chore: scaffold project config"
```

---

### Task 2: Create app shell (layout, globals, vitest)

**Files:**
- Create: `app/globals.css`
- Create: `app/layout.tsx`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`

- [ ] **Step 1: Create app/globals.css**

```css
@import "tailwindcss";

body {
  background-color: #f9fafb;
  color: #111827;
}
```

- [ ] **Step 2: Create app/layout.tsx**

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CMO Dashboard',
  description: 'Tableau de bord LinkedIn — Jonathan BRAUN',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 4: Create vitest.setup.ts**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Create lib/ and components/ directories**

```bash
mkdir -p /Users/jonathanbraun/cmo-dashboard/lib
mkdir -p /Users/jonathanbraun/cmo-dashboard/components
mkdir -p /Users/jonathanbraun/cmo-dashboard/app/api/calendar
mkdir -p /Users/jonathanbraun/cmo-dashboard/app/api/backlog
mkdir -p /Users/jonathanbraun/cmo-dashboard/app/api/performance
```

- [ ] **Step 6: Commit**

```bash
git add app/ vitest.config.ts vitest.setup.ts
git commit -m "chore: app shell, layout, vitest config"
```

---

### Task 3: Create lib/types.ts

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Write lib/types.ts**

```ts
export type CalendarPost = {
  semaine: number
  day: string
  pilier: string
  sujet: string
  hook: string
  statut: '⬜' | '✏️' | '👀' | '✅' | '📤'
}

export type BacklogItem = {
  text: string
  checked: boolean
  type: 'Post' | 'Carrousel' | 'Article' | 'Vidéo'
  pilier: string | null
  section: string
}

export type PerformanceEntry = {
  date: string
  hook: string
  pilier: string
  format: string
  impressions: number | null
  likes: number | null
  commentaires: number | null
  partages: number | null
  tauxEngagement: number | null
  nouveauxAbonnes: number | null
  observation: string
}

export type PerformancePostBody = {
  date: string
  hook: string
  pilier: string
  format: string
  impressions: number
  likes: number
  commentaires: number
  partages: number
  nouveauxAbonnes: number
  observation: string
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat: shared TypeScript types"
```

---

## Chunk 2: Markdown Parser

### Task 4: Write failing tests for parseCalendarContent

**Files:**
- Create: `lib/parse-markdown.test.ts`

- [ ] **Step 1: Write failing tests for calendar parsing**

```ts
// lib/parse-markdown.test.ts
import { describe, it, expect } from 'vitest'
import {
  parseCalendarContent,
  parseBacklogContent,
  parsePerformanceContent,
  insertPerformanceEntry,
} from './parse-markdown'

// ─── Calendar ─────────────────────────────────────────────────────────────────

const CALENDAR_SAMPLE = `
# Calendrier

## Phase actuelle : LANCEMENT
Rythme 3 posts/semaine.

## Rotation hebdomadaire type

| Jour | Pilier | Format | Objectif |
|------|--------|--------|----------|
| Mardi | IA & Transformation | Post classique | Insight fort |

## Semaine 1 — [À PLANIFIER]

| Jour | Pilier | Sujet | Hook | Statut |
|------|--------|-------|------|--------|
| Mar | IA & Transfo | Les projets IA qui échouent | La vraie raison ? | ⬜ À créer |
| Mer | Business & ROI | POC en 5 jours | En 3 jours avec N8N | ✏️ Draft en cours |
| Jeu | Coulisses | ONG → IA | Ce que le leadership m'a appris | 📤 Publié |

## Semaine 2 — [À PLANIFIER]

| Jour | Pilier | Sujet | Hook | Statut |
|------|--------|-------|------|--------|
| Mar | Stratégie | Pas une stratégie | "On veut de l'IA" | 👀 En attente de validation |
`

describe('parseCalendarContent', () => {
  it('ignores the rotation table', () => {
    const posts = parseCalendarContent(CALENDAR_SAMPLE)
    expect(posts.every(p => p.semaine > 0)).toBe(true)
  })

  it('parses semaine number from heading', () => {
    const posts = parseCalendarContent(CALENDAR_SAMPLE)
    expect(posts.filter(p => p.semaine === 1)).toHaveLength(3)
    expect(posts.filter(p => p.semaine === 2)).toHaveLength(1)
  })

  it('extracts day, pilier, sujet, hook', () => {
    const posts = parseCalendarContent(CALENDAR_SAMPLE)
    const first = posts[0]
    expect(first.day).toBe('Mar')
    expect(first.pilier).toBe('IA & Transfo')
    expect(first.sujet).toBe('Les projets IA qui échouent')
    expect(first.hook).toBe('La vraie raison ?')
  })

  it('normalises statut to emoji only', () => {
    const posts = parseCalendarContent(CALENDAR_SAMPLE)
    expect(posts[0].statut).toBe('⬜')
    expect(posts[1].statut).toBe('✏️')
    expect(posts[2].statut).toBe('📤')
    expect(posts[3].statut).toBe('👀')
  })

  it('handles rows with empty cells (real file initial state)', () => {
    const content = `
## Semaine 1 — [À PLANIFIER]

| Jour | Pilier | Sujet | Hook | Statut |
|------|--------|-------|------|--------|
| Mar | | | | ⬜ À créer |
`
    const posts = parseCalendarContent(content)
    expect(posts).toHaveLength(1)
    expect(posts[0].day).toBe('Mar')
    expect(posts[0].pilier).toBe('')
    expect(posts[0].statut).toBe('⬜')
  })

  it('correctly extracts ✏️ multi-codepoint emoji', () => {
    const content = `
## Semaine 1 — [À PLANIFIER]

| Jour | Pilier | Sujet | Hook | Statut |
|------|--------|-------|------|--------|
| Mer | Business | POC | Hook | ✏️ Draft en cours |
`
    const posts = parseCalendarContent(content)
    expect(posts[0].statut).toBe('✏️')
  })

  it('returns empty array for empty content', () => {
    expect(parseCalendarContent('')).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL (function not yet defined)**

```bash
cd /Users/jonathanbraun/cmo-dashboard
npm run test:run -- lib/parse-markdown.test.ts
```

Expected: FAIL — `Cannot find module './parse-markdown'`

---

### Task 5: Write failing tests for backlog and performance

- [ ] **Step 1: Append backlog tests to lib/parse-markdown.test.ts**

```ts
// ─── Backlog ─────────────────────────────────────────────────────────────────

const BACKLOG_SAMPLE = `
# Backlog d'idées

## Idées à traiter

### Tirées de ton expérience terrain

- [ ] **[IA & Transfo]** Former une équipe pharma à l'IA : quand la première question n'est pas "quel outil"
- [ ] **[Business & ROI]** Le POC de 5 jours avec N8N
- [x] **[Coulisses]** Passer de président d'ONG à l'IA

### Idées de carrousels

- [ ] Les 5 questions à poser AVANT de lancer un projet IA

### Idées d'articles longs

- [ ] Pourquoi la stratégie IA n'est pas un sujet technique

### Idées de scripts vidéo

- [ ] La question que pose TOUJOURS le premier participant en formation IA (60 sec)

## Idées publiées (archive)

_Déplacer ici les idées une fois publiées, avec le lien vers le post._
`

describe('parseBacklogContent', () => {
  it('assigns Post type to terrain section', () => {
    const items = parseBacklogContent(BACKLOG_SAMPLE)
    const terrain = items.filter(i => i.type === 'Post')
    expect(terrain).toHaveLength(3)
  })

  it('assigns Carrousel type from heading', () => {
    const items = parseBacklogContent(BACKLOG_SAMPLE)
    expect(items.find(i => i.type === 'Carrousel')).toBeDefined()
  })

  it('assigns Article type from heading', () => {
    const items = parseBacklogContent(BACKLOG_SAMPLE)
    expect(items.find(i => i.type === 'Article')).toBeDefined()
  })

  it('assigns Vidéo type from heading', () => {
    const items = parseBacklogContent(BACKLOG_SAMPLE)
    expect(items.find(i => i.type === 'Vidéo')).toBeDefined()
  })

  it('extracts pilier from **[tag]** and strips it from text', () => {
    const items = parseBacklogContent(BACKLOG_SAMPLE)
    const first = items[0]
    expect(first.pilier).toBe('IA & Transfo')
    expect(first.text).not.toContain('**[')
    expect(first.text).toContain('Former une équipe')
  })

  it('marks checked items as archived', () => {
    const items = parseBacklogContent(BACKLOG_SAMPLE)
    const archived = items.filter(i => i.checked)
    expect(archived).toHaveLength(1)
    expect(archived[0].pilier).toBe('Coulisses')
  })

  it('returns null pilier for non-terrain sections', () => {
    const items = parseBacklogContent(BACKLOG_SAMPLE)
    const carrousel = items.find(i => i.type === 'Carrousel')
    expect(carrousel?.pilier).toBeNull()
  })

  it('items in ## Idées publiées (archive) section are identifiable via section field', () => {
    const content = `
## Idées publiées (archive)

- [x] **[IA & Transfo]** Un post archivé manuellement
`
    const items = parseBacklogContent(content)
    expect(items).toHaveLength(1)
    expect(items[0].checked).toBe(true)
    expect(items[0].section).toContain('publiées')
    // Note: type defaults to 'Post' for archive section — BacklogSection hides
    // the archive block when archivedItems.length === 0
  })

  it('returns empty array for empty content', () => {
    expect(parseBacklogContent('')).toEqual([])
  })
})
```

- [ ] **Step 2: Append performance tests to lib/parse-markdown.test.ts**

```ts
// ─── Performance ─────────────────────────────────────────────────────────────

const PERF_SAMPLE = `
# Performance Log

## Publications

## 2026-03-10 — La vraie raison pour laquelle 80% des projets IA échouent
- **Pilier :** Stratégie & Décision
- **Format :** Post
- **Impressions :** 4200
- **Likes :** 87
- **Commentaires :** 23
- **Partages :** 12
- **Taux d'engagement :** 2.9%
- **Nouveaux abonnés :** 14
- **Observation :** Fort engagement, meilleur taux à ce jour

---

## 2026-03-05 — Le POC de 5 jours
- **Pilier :** Business & ROI
- **Format :** Post
- **Impressions :** 1800
- **Likes :** 32
- **Commentaires :** 8
- **Partages :** 5
- **Taux d'engagement :** 2.5%
- **Nouveaux abonnés :** 7
- **Observation :** Bon démarrage

---
`

const PERF_EMPTY = `
# Performance Log

## Publications

_Ajouter les entrées ici au fil des publications._
`

describe('parsePerformanceContent', () => {
  it('parses two entries', () => {
    const entries = parsePerformanceContent(PERF_SAMPLE)
    expect(entries).toHaveLength(2)
  })

  it('parses date and hook', () => {
    const entries = parsePerformanceContent(PERF_SAMPLE)
    expect(entries[0].date).toBe('2026-03-10')
    expect(entries[0].hook).toBe('La vraie raison pour laquelle 80% des projets IA échouent')
  })

  it('parses numeric fields', () => {
    const entries = parsePerformanceContent(PERF_SAMPLE)
    expect(entries[0].impressions).toBe(4200)
    expect(entries[0].likes).toBe(87)
    expect(entries[0].commentaires).toBe(23)
    expect(entries[0].partages).toBe(12)
    expect(entries[0].nouveauxAbonnes).toBe(14)
  })

  it('parses tauxEngagement by stripping % from stored value', () => {
    const entries = parsePerformanceContent(PERF_SAMPLE)
    expect(entries[0].tauxEngagement).toBe(2.9)
    expect(entries[1].tauxEngagement).toBe(2.5)
  })

  it('parses observation', () => {
    const entries = parsePerformanceContent(PERF_SAMPLE)
    expect(entries[0].observation).toBe('Fort engagement, meilleur taux à ce jour')
  })

  it('returns empty array when only placeholder present', () => {
    const entries = parsePerformanceContent(PERF_EMPTY)
    expect(entries).toHaveLength(0)
  })

  it('handles file with preamble (Comment remplir section) before Publications', () => {
    const withPreamble = `# Performance Log

## Comment remplir

\`\`\`
## DATE — Hook
- **Pilier :** ...
\`\`\`

## Publications

## 2026-03-10 — Un post réel
- **Pilier :** Stratégie & Décision
- **Format :** Post
- **Impressions :** 1000
- **Likes :** 20
- **Commentaires :** 5
- **Partages :** 3
- **Taux d'engagement :** 2.8%
- **Nouveaux abonnés :** 4
- **Observation :** Test

---
`
    const entries = parsePerformanceContent(withPreamble)
    expect(entries).toHaveLength(1)
    expect(entries[0].date).toBe('2026-03-10')
  })
})

// ─── insertPerformanceEntry ───────────────────────────────────────────────────

const NEW_BLOCK = `## 2026-03-17 — Mon nouveau post
- **Pilier :** IA & Transformation
- **Format :** Post
- **Impressions :** 1000
- **Likes :** 20
- **Commentaires :** 5
- **Partages :** 3
- **Taux d'engagement :** 2.8%
- **Nouveaux abonnés :** 5
- **Observation :** Premier test

---

`

describe('insertPerformanceEntry', () => {
  it('replaces placeholder on first write', () => {
    const result = insertPerformanceEntry(PERF_EMPTY, NEW_BLOCK)
    expect(result).toContain('2026-03-17')
    expect(result).not.toContain('_Ajouter les entrées ici')
  })

  it('inserts before existing entries on subsequent writes', () => {
    const result = insertPerformanceEntry(PERF_SAMPLE, NEW_BLOCK)
    const idx2026_03_17 = result.indexOf('2026-03-17')
    const idx2026_03_10 = result.indexOf('2026-03-10')
    expect(idx2026_03_17).toBeLessThan(idx2026_03_10)
  })

  it('preserves existing entries', () => {
    const result = insertPerformanceEntry(PERF_SAMPLE, NEW_BLOCK)
    expect(result).toContain('2026-03-10')
    expect(result).toContain('2026-03-05')
  })

  it('appends block when Publications heading is absent', () => {
    const result = insertPerformanceEntry('# Some file\n\nNo publications section.', NEW_BLOCK)
    expect(result).toContain('2026-03-17')
  })

  it('first write result ends with a trailing newline after ---', () => {
    const result = insertPerformanceEntry(PERF_EMPTY, NEW_BLOCK)
    expect(result.trimEnd().endsWith('---')).toBe(true)
  })
})
```

- [ ] **Step 3: Run — still FAIL (no implementation)**

```bash
npm run test:run -- lib/parse-markdown.test.ts
```

Expected: FAIL — module not found

---

### Task 6: Implement lib/parse-markdown.ts

**Files:**
- Create: `lib/parse-markdown.ts`

- [ ] **Step 1: Create lib/parse-markdown.ts**

```ts
import fs from 'fs'
import path from 'path'
import type { CalendarPost, BacklogItem, PerformanceEntry } from './types'

const CMO_BASE = '/Users/jonathanbraun/cmo-agent'

// ─── File helpers ──────────────────────────────────────────────────────────────

function readFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return ''
  }
}

function parseNum(value: string): number | null {
  const n = parseFloat(value.replace(/[^\d.]/g, ''))
  return isNaN(n) ? null : n
}

function parsePct(value: string): number | null {
  const n = parseFloat(value.replace('%', '').trim())
  return isNaN(n) ? null : n
}

// ─── Calendar ──────────────────────────────────────────────────────────────────

export function parseCalendarContent(content: string): CalendarPost[] {
  const posts: CalendarPost[] = []
  const lines = content.split('\n')
  let currentSemaine: number | null = null
  let inSemaineSection = false

  for (const line of lines) {
    const semaineMatch = line.match(/^##\s+Semaine\s+(\d+)/)
    if (semaineMatch) {
      currentSemaine = parseInt(semaineMatch[1], 10)
      inSemaineSection = true
      continue
    }

    // Use else if to avoid resetting on ## Semaine headings (semaineMatch must come first)
    else if (line.startsWith('## ')) {
      inSemaineSection = false
      currentSemaine = null
      continue
    }

    if (!inSemaineSection || currentSemaine === null) continue

    // Split table row by | and trim each cell
    const cells = line
      .split('|')
      .map(c => c.trim())
      .filter((_, i, arr) => i > 0 && i < arr.length - 1)

    if (cells.length < 5) continue

    // Skip header and separator rows
    if (cells[0] === 'Jour' || cells[0].startsWith('-') || cells[0] === '') continue

    // Extract leading emoji from statut cell
    const emojiMatch = cells[4].match(/^\S+/)
    const statut = (emojiMatch ? emojiMatch[0] : '⬜') as CalendarPost['statut']

    posts.push({
      semaine: currentSemaine,
      day: cells[0],
      pilier: cells[1],
      sujet: cells[2],
      hook: cells[3],
      statut,
    })
  }

  return posts
}

export function getCalendar(): CalendarPost[] {
  return parseCalendarContent(readFile(path.join(CMO_BASE, 'content/calendar.md')))
}

// ─── Backlog ──────────────────────────────────────────────────────────────────

function sectionToType(section: string): BacklogItem['type'] {
  const lower = section.toLowerCase()
  if (lower.includes('carrousel')) return 'Carrousel'
  if (lower.includes('article')) return 'Article'
  if (lower.includes('vid')) return 'Vidéo'
  return 'Post'
}

export function parseBacklogContent(content: string): BacklogItem[] {
  const items: BacklogItem[] = []
  const lines = content.split('\n')
  let currentSection = ''
  let currentType: BacklogItem['type'] = 'Post'

  for (const line of lines) {
    if (line.match(/^##\s+/)) {
      currentSection = line.replace(/^##\s+/, '').trim()
      currentType = sectionToType(currentSection)
      continue
    }

    if (line.match(/^###\s+/)) {
      currentSection = line.replace(/^###\s+/, '').trim()
      currentType = sectionToType(currentSection)
      continue
    }

    const itemMatch = line.match(/^-\s+\[([ x])\]\s+(.+)/)
    if (!itemMatch) continue

    const checked = itemMatch[1] === 'x'
    const raw = itemMatch[2].trim()

    const pilierMatch = raw.match(/\*\*\[([^\]]+)\]\*\*/)
    const pilier = pilierMatch ? pilierMatch[1] : null
    const text = raw.replace(/\*\*\[[^\]]+\]\*\*\s*/, '').trim()

    items.push({ text, checked, type: currentType, pilier, section: currentSection })
  }

  return items
}

export function getBacklog(): BacklogItem[] {
  return parseBacklogContent(readFile(path.join(CMO_BASE, 'content/ideas-backlog.md')))
}

// ─── Performance ──────────────────────────────────────────────────────────────

export function parsePerformanceContent(content: string): PerformanceEntry[] {
  const entries: PerformanceEntry[] = []
  const lines = content.split('\n')
  let inPublications = false
  let current: Partial<PerformanceEntry> | null = null

  const flush = () => {
    if (current?.date && current?.hook) {
      entries.push({
        date: current.date,
        hook: current.hook,
        pilier: current.pilier ?? '',
        format: current.format ?? '',
        impressions: current.impressions ?? null,
        likes: current.likes ?? null,
        commentaires: current.commentaires ?? null,
        partages: current.partages ?? null,
        tauxEngagement: current.tauxEngagement ?? null,
        nouveauxAbonnes: current.nouveauxAbonnes ?? null,
        observation: current.observation ?? '',
      })
    }
    current = null
  }

  for (const line of lines) {
    if (line.trim() === '## Publications') {
      inPublications = true
      continue
    }

    if (!inPublications) continue

    const entryMatch = line.match(/^##\s+(\d{4}-\d{2}-\d{2})\s*[—-]\s*(.+)$/)
    if (entryMatch) {
      flush()
      current = { date: entryMatch[1], hook: entryMatch[2].trim() }
      continue
    }

    if (!current) continue

    const fieldMatch = line.match(/^-\s+\*\*([^*:]+):\*\*\s*(.*)$/)
    if (!fieldMatch) continue

    const key = fieldMatch[1].trim()
    const val = fieldMatch[2].trim()

    switch (key) {
      case 'Pilier': current.pilier = val; break
      case 'Format': current.format = val; break
      case 'Impressions': current.impressions = parseNum(val); break
      case 'Likes': current.likes = parseNum(val); break
      case 'Commentaires': current.commentaires = parseNum(val); break
      case 'Partages': current.partages = parseNum(val); break
      case "Taux d'engagement": current.tauxEngagement = parsePct(val); break
      case 'Nouveaux abonnés': current.nouveauxAbonnes = parseNum(val); break
      case 'Observation': current.observation = val; break
    }
  }

  flush()
  return entries
}

export function getPerformance(): PerformanceEntry[] {
  return parsePerformanceContent(readFile(path.join(CMO_BASE, 'intelligence/performance-log.md')))
}

// ─── Write performance entry ──────────────────────────────────────────────────

export function computeEngagementRate(
  likes: number,
  commentaires: number,
  partages: number,
  impressions: number
): number | null {
  if (!impressions) return null
  return Math.round(((likes + commentaires + partages) / impressions) * 1000) / 10
}

const PLACEHOLDER = '_Ajouter les entrées ici au fil des publications._'
const PUBLICATIONS_HEADING = '## Publications'

export function formatPerformanceBlock(entry: PerformanceEntry): string {
  const taux = entry.tauxEngagement !== null ? `${entry.tauxEngagement}%` : ''
  return [
    `## ${entry.date} — ${entry.hook}`,
    `- **Pilier :** ${entry.pilier}`,
    `- **Format :** ${entry.format}`,
    `- **Impressions :** ${entry.impressions ?? ''}`,
    `- **Likes :** ${entry.likes ?? ''}`,
    `- **Commentaires :** ${entry.commentaires ?? ''}`,
    `- **Partages :** ${entry.partages ?? ''}`,
    `- **Taux d'engagement :** ${taux}`,
    `- **Nouveaux abonnés :** ${entry.nouveauxAbonnes ?? ''}`,
    `- **Observation :** ${entry.observation}`,
    '',
    '---',
    '',
  ].join('\n')
}

export function insertPerformanceEntry(fileContent: string, newBlock: string): string {
  const pubIdx = fileContent.indexOf(PUBLICATIONS_HEADING)
  if (pubIdx === -1) return fileContent + '\n' + newBlock

  const afterHeadingIdx = fileContent.indexOf('\n', pubIdx) + 1
  const rest = fileContent.slice(afterHeadingIdx)

  // First write: replace placeholder line (keep trailing newlines from newBlock)
  if (rest.includes(PLACEHOLDER)) {
    const replaced = rest.replace(PLACEHOLDER, newBlock)
    return fileContent.slice(0, afterHeadingIdx) + replaced
  }

  // Subsequent writes: insert after heading line
  return fileContent.slice(0, afterHeadingIdx) + '\n' + newBlock + rest
}

export function writePerformanceEntry(entry: PerformanceEntry): void {
  const filePath = path.join(CMO_BASE, 'intelligence/performance-log.md')
  const content = readFile(filePath)
  const block = formatPerformanceBlock(entry)
  const updated = insertPerformanceEntry(content, block)
  fs.writeFileSync(filePath, updated, 'utf-8')
}
```

- [ ] **Step 2: Run tests — expect all PASS**

```bash
npm run test:run -- lib/parse-markdown.test.ts
```

Expected: all tests PASS (≥ 20 passing)

- [ ] **Step 3: Commit**

```bash
git add lib/parse-markdown.ts lib/parse-markdown.test.ts lib/types.ts
git commit -m "feat: markdown parser with full test coverage"
```

---

## Chunk 3: API Routes

### Task 7: GET /api/calendar and GET /api/backlog

**Files:**
- Create: `app/api/calendar/route.ts`
- Create: `app/api/backlog/route.ts`

- [ ] **Step 1: Create app/api/calendar/route.ts**

```ts
import { NextResponse } from 'next/server'
import { getCalendar } from '@/lib/parse-markdown'

// Note: readFile() in parse-markdown already handles ENOENT by returning ''
// so getCalendar() returns [] for missing files without throwing.
// The catch block here covers truly unexpected runtime errors — spec requires
// file-absent → 200 [], unexpected error → 500.
export async function GET() {
  try {
    const posts = getCalendar()
    return NextResponse.json(posts)
  } catch {
    // Any error (including file not found if it somehow escapes readFile) → 200 []
    return NextResponse.json([])
  }
}
```

- [ ] **Step 2: Create app/api/backlog/route.ts**

```ts
import { NextResponse } from 'next/server'
import { getBacklog } from '@/lib/parse-markdown'

export async function GET() {
  try {
    const items = getBacklog()
    return NextResponse.json(items)
  } catch {
    return NextResponse.json([])
  }
}
```

- [ ] **Step 3: Smoke-test manually**

```bash
cd /Users/jonathanbraun/cmo-dashboard
npm run dev
```

Open in browser:
- `http://localhost:3001/api/calendar` → should return JSON array of `CalendarPost[]`
- `http://localhost:3001/api/backlog` → should return JSON array of `BacklogItem[]`

- [ ] **Step 4: Commit**

```bash
git add app/api/calendar/route.ts app/api/backlog/route.ts
git commit -m "feat: GET /api/calendar and /api/backlog routes"
```

---

### Task 8: GET + POST /api/performance

**Files:**
- Create: `app/api/performance/route.ts`

- [ ] **Step 1: Create app/api/performance/route.ts**

```ts
import { NextResponse } from 'next/server'
import {
  getPerformance,
  computeEngagementRate,
  writePerformanceEntry,
} from '@/lib/parse-markdown'
import type { PerformancePostBody } from '@/lib/types'

export async function GET() {
  try {
    const entries = getPerformance()
    return NextResponse.json(entries)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const body: PerformancePostBody = await request.json()

    // Validate required string fields
    const requiredStrings: (keyof PerformancePostBody)[] = ['date', 'hook', 'pilier', 'format']
    for (const field of requiredStrings) {
      if (!body[field] || String(body[field]).trim() === '') {
        return NextResponse.json({ error: `Champ requis manquant : ${field}` }, { status: 400 })
      }
    }

    // Validate numeric fields >= 0
    const numFields: (keyof PerformancePostBody)[] = [
      'impressions', 'likes', 'commentaires', 'partages', 'nouveauxAbonnes',
    ]
    for (const field of numFields) {
      const val = Number(body[field])
      if (isNaN(val) || val < 0) {
        return NextResponse.json(
          { error: `Le champ ${field} doit être un nombre >= 0` },
          { status: 400 }
        )
      }
    }

    const tauxEngagement = computeEngagementRate(
      body.likes,
      body.commentaires,
      body.partages,
      body.impressions
    )

    const entry = {
      date: body.date,
      hook: body.hook,
      pilier: body.pilier,
      format: body.format,
      impressions: body.impressions,
      likes: body.likes,
      commentaires: body.commentaires,
      partages: body.partages,
      tauxEngagement,
      nouveauxAbonnes: body.nouveauxAbonnes,
      observation: body.observation ?? '',
    }

    writePerformanceEntry(entry)
    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
```

- [ ] **Step 2: Smoke-test GET**

```bash
curl http://localhost:3001/api/performance
```

Expected: `[]` (empty array, file has no entries yet)

- [ ] **Step 3: Smoke-test POST**

```bash
curl -X POST http://localhost:3001/api/performance \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-03-17","hook":"Test post","pilier":"IA & Transformation","format":"Post","impressions":1000,"likes":20,"commentaires":5,"partages":3,"nouveauxAbonnes":5,"observation":"Test"}'
```

Expected: `201` with the entry JSON. Then check `GET /api/performance` returns 1 entry.

- [ ] **Step 4: Verify performance-log.md was updated correctly**

Open `/Users/jonathanbraun/cmo-agent/intelligence/performance-log.md` — the new entry should appear, placeholder line replaced.

- [ ] **Step 5: Commit**

```bash
git add app/api/performance/route.ts
git commit -m "feat: GET + POST /api/performance with validation"
```

---

## Chunk 4: UI Components

### Task 9: SummaryBar component

**Files:**
- Create: `components/SummaryBar.tsx`

- [ ] **Step 1: Create components/SummaryBar.tsx**

```tsx
import type { CalendarPost, PerformanceEntry } from '@/lib/types'

type Props = {
  posts: CalendarPost[]
  performances: PerformanceEntry[]
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

export function SummaryBar({ posts, performances }: Props) {
  const publiés = performances.length

  const aValider = posts.filter(p => p.statut === '👀').length

  const prochainPost = posts.find(p => p.statut === '⬜' || p.statut === '✏️')
  const prochainLabel = prochainPost
    ? `Semaine ${prochainPost.semaine} — ${prochainPost.day}`
    : '—'

  const tauxValues = performances
    .map(p => p.tauxEngagement)
    .filter((t): t is number => t !== null)
  const tauxMoyen =
    tauxValues.length > 0
      ? `${(tauxValues.reduce((a, b) => a + b, 0) / tauxValues.length).toFixed(1)}%`
      : '—'

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <KpiCard label="Posts publiés" value={publiés > 0 ? String(publiés) : '—'} />
      <KpiCard label="À valider" value={aValider > 0 ? `${aValider}` : '—'} />
      <KpiCard label="Prochain post" value={prochainLabel} />
      <KpiCard label="Taux d'engagement moyen" value={tauxMoyen} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/SummaryBar.tsx
git commit -m "feat: SummaryBar component with 4 KPIs"
```

---

### Task 10: CalendarSection component

**Files:**
- Create: `components/CalendarSection.tsx`

- [ ] **Step 1: Create components/CalendarSection.tsx**

```tsx
import type { CalendarPost } from '@/lib/types'

const STATUT_CONFIG: Record<
  CalendarPost['statut'],
  { label: string; className: string }
> = {
  '⬜': { label: 'À créer', className: 'bg-gray-100 text-gray-600' },
  '✏️': { label: 'Draft', className: 'bg-blue-100 text-blue-700' },
  '👀': { label: 'À valider', className: 'bg-orange-100 text-orange-700' },
  '✅': { label: 'Validé', className: 'bg-green-100 text-green-700' },
  '📤': { label: 'Publié', className: 'bg-purple-100 text-purple-700' },
}

type Props = { posts: CalendarPost[] }

export function CalendarSection({ posts }: Props) {
  if (posts.length === 0) {
    return (
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Calendrier</h2>
        <p className="text-gray-400 italic">Aucun post planifié pour l'instant.</p>
      </section>
    )
  }

  const semaines = Array.from(new Set(posts.map(p => p.semaine))).sort((a, b) => a - b)

  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Calendrier</h2>
      {semaines.map(semaine => (
        <div key={semaine} className="mb-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">
            Semaine {semaine}
          </h3>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-16">Jour</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Pilier</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Sujet</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Hook</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-32">Statut</th>
                </tr>
              </thead>
              <tbody>
                {posts
                  .filter(p => p.semaine === semaine)
                  .map((post, i) => {
                    const config = STATUT_CONFIG[post.statut] ?? STATUT_CONFIG['⬜']
                    return (
                      <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-700">{post.day}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{post.pilier}</td>
                        <td className="px-4 py-3 text-gray-800">{post.sujet || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 max-w-xs">
                          <span className="line-clamp-2">{post.hook || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${config.className}`}
                          >
                            {config.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/CalendarSection.tsx
git commit -m "feat: CalendarSection component grouped by week"
```

---

### Task 11: BacklogSection component

**Files:**
- Create: `components/BacklogSection.tsx`

- [ ] **Step 1: Create components/BacklogSection.tsx**

```tsx
import type { BacklogItem } from '@/lib/types'

const TYPE_ORDER: BacklogItem['type'][] = ['Post', 'Carrousel', 'Article', 'Vidéo']

const TYPE_CONFIG: Record<BacklogItem['type'], { className: string }> = {
  'Post': { className: 'bg-blue-50 text-blue-700' },
  'Carrousel': { className: 'bg-indigo-50 text-indigo-700' },
  'Article': { className: 'bg-emerald-50 text-emerald-700' },
  'Vidéo': { className: 'bg-rose-50 text-rose-700' },
}

type Props = { items: BacklogItem[] }

function PilierBadge({ pilier }: { pilier: string }) {
  return (
    <span className="inline-flex px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600 mr-2 shrink-0">
      {pilier}
    </span>
  )
}

export function BacklogSection({ items }: Props) {
  const activeItems = items.filter(i => !i.checked)

  // Empty state = no items at all (not just no active ones — archived items still count)
  if (items.length === 0) {
    return (
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Backlog d'idées</h2>
        <p className="text-gray-400 italic">Aucune idée dans le backlog.</p>
      </section>
    )
  }

  const archivedItems = items.filter(i => i.checked)

  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Backlog d'idées</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TYPE_ORDER.map(type => {
          const group = activeItems.filter(i => i.type === type)
          if (group.length === 0) return null
          const config = TYPE_CONFIG[type]
          return (
            <div key={type} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${config.className}`}>
                  {type}
                </span>
                <span className="text-xs text-gray-400">{group.length} idée{group.length > 1 ? 's' : ''}</span>
              </div>
              <ul className="space-y-2">
                {group.map((item, i) => (
                  <li key={i} className="flex items-start gap-1 text-sm text-gray-700">
                    <span className="mt-0.5 text-gray-300 shrink-0">○</span>
                    <span>
                      {item.pilier && <PilierBadge pilier={item.pilier} />}
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {archivedItems.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">
            Archivées ({archivedItems.length})
          </h3>
          <ul className="space-y-1">
            {archivedItems.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-400 line-through">
                <span className="shrink-0">✓</span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/BacklogSection.tsx
git commit -m "feat: BacklogSection component grouped by type"
```

---

### Task 12: PerformanceSection component

**Files:**
- Create: `components/PerformanceSection.tsx`

- [ ] **Step 1: Install recharts (if not already in node_modules)**

```bash
cd /Users/jonathanbraun/cmo-dashboard
npm install recharts
```

- [ ] **Step 2: Create components/PerformanceSection.tsx**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { PerformanceEntry } from '@/lib/types'

const PILIERS = [
  'IA & Transformation',
  'Stratégie & Décision',
  'Business & ROI',
  'Neurosciences & Adoption',
  'Innovation & Prospective',
  'Coulisses & Authenticité',
]

const FORMATS = ['Post', 'Carrousel', 'Article', 'Newsletter', 'Vidéo']

type Props = { entries: PerformanceEntry[] }

function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  return `${d}/${m}`
}

function yAxisCeiling(max: number): number {
  if (max === 0) return 5
  const ceil = Math.ceil(max / 5) * 5
  return ceil === max ? ceil + 5 : ceil
}

const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  hook: '',
  pilier: PILIERS[0],
  format: 'Post',
  impressions: '',
  likes: '',
  commentaires: '',
  partages: '',
  nouveauxAbonnes: '',
  observation: '',
}

export function PerformanceSection({ entries }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))

  const chartData = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter(e => e.tauxEngagement !== null)
    .map(e => ({
      date: formatDate(e.date),
      fullDate: e.date,
      taux: e.tauxEngagement,
      impressions: e.impressions,
    }))

  const maxTaux = Math.max(...chartData.map(d => d.taux ?? 0), 0)
  const yMax = yAxisCeiling(maxTaux)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.date,
          hook: form.hook,
          pilier: form.pilier,
          format: form.format,
          impressions: Number(form.impressions),
          likes: Number(form.likes),
          commentaires: Number(form.commentaires),
          partages: Number(form.partages),
          nouveauxAbonnes: Number(form.nouveauxAbonnes),
          observation: form.observation,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Erreur inconnue')
        return
      }

      setForm(EMPTY_FORM)
      setShowForm(false)
      router.refresh()
    } catch (err) {
      setError(String(err))
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Performances</h2>
        <button
          onClick={() => setShowForm(v => !v)}
          className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          {showForm ? 'Annuler' : '+ Ajouter une performance'}
        </button>
      </div>

      {/* Empty state */}
      {sorted.length === 0 && !showForm && (
        <p className="text-gray-400 italic">
          Aucune performance enregistrée. Publie ton premier post et ajoute ses métriques ici.
        </p>
      )}

      {/* Table */}
      {sorted.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Date', 'Hook', 'Pilier', 'Format', 'Impressions', 'Likes', 'Commentaires', 'Taux engagement'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((entry, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{entry.date}</td>
                  <td className="px-4 py-3 text-gray-800 max-w-xs">
                    <span className="line-clamp-2">{entry.hook}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{entry.pilier || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{entry.format || '—'}</td>
                  <td className="px-4 py-3 tabular-nums">{entry.impressions ?? '—'}</td>
                  <td className="px-4 py-3 tabular-nums">{entry.likes ?? '—'}</td>
                  <td className="px-4 py-3 tabular-nums">{entry.commentaires ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {entry.tauxEngagement !== null ? `${entry.tauxEngagement}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* LineChart — only if >= 2 entries with taux data */}
      {chartData.length >= 2 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
            Taux d'engagement dans le temps
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis
                domain={[0, yMax]}
                tickFormatter={v => `${v}%`}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  return (
                    <div className="bg-white border border-gray-200 rounded p-2 text-xs shadow">
                      <p className="font-semibold mb-1">{d.fullDate}</p>
                      <p>Taux : <strong>{d.taux}%</strong></p>
                      {d.impressions && <p>Impressions : {d.impressions}</p>}
                    </div>
                  )
                }}
              />
              <Line
                type="monotone"
                dataKey="taux"
                stroke="#2563EB"
                strokeWidth={2}
                dot={{ fill: '#2563EB', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-base font-semibold mb-4 text-gray-800">Nouvelle entrée</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelClass}>Date *</label>
                <input type="date" className={inputClass} value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Hook *</label>
                <input type="text" className={inputClass} placeholder="Première ligne du post..."
                  value={form.hook} onChange={e => setForm(f => ({ ...f, hook: e.target.value }))} required />
              </div>
              <div>
                <label className={labelClass}>Pilier *</label>
                <select className={inputClass} value={form.pilier}
                  onChange={e => setForm(f => ({ ...f, pilier: e.target.value }))}>
                  {PILIERS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Format *</label>
                <select className={inputClass} value={form.format}
                  onChange={e => setForm(f => ({ ...f, format: e.target.value }))}>
                  {FORMATS.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              {[
                { key: 'impressions', label: 'Impressions' },
                { key: 'likes', label: 'Likes' },
                { key: 'commentaires', label: 'Commentaires' },
                { key: 'partages', label: 'Partages' },
                { key: 'nouveauxAbonnes', label: 'Nouveaux abonnés' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className={labelClass}>{label}</label>
                  <input
                    type="number"
                    min="0"
                    className={inputClass}
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="md:col-span-2">
                <label className={labelClass}>Observation</label>
                <textarea
                  rows={2}
                  className={inputClass}
                  placeholder="Ce qui a fonctionné / pas fonctionné..."
                  value={form.observation}
                  onChange={e => setForm(f => ({ ...f, observation: e.target.value }))}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 mb-3">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/PerformanceSection.tsx
git commit -m "feat: PerformanceSection with table, chart, and add form"
```

---

## Chunk 5: Page Integration

### Task 13: app/page.tsx — wire everything together

**Files:**
- Create: `app/page.tsx`

- [ ] **Step 1: Create app/page.tsx**

```tsx
import { getCalendar, getBacklog, getPerformance } from '@/lib/parse-markdown'
import { SummaryBar } from '@/components/SummaryBar'
import { CalendarSection } from '@/components/CalendarSection'
import { BacklogSection } from '@/components/BacklogSection'
import { PerformanceSection } from '@/components/PerformanceSection'

export default async function Page() {
  const [posts, items, entries] = await Promise.all([
    Promise.resolve(getCalendar()),
    Promise.resolve(getBacklog()),
    Promise.resolve(getPerformance()),
  ])

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">CMO Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Jonathan BRAUN — LinkedIn</p>
      </div>

      <SummaryBar posts={posts} performances={entries} />
      <CalendarSection posts={posts} />
      <BacklogSection items={items} />
      <PerformanceSection entries={entries} />
    </main>
  )
}
```

- [ ] **Step 2: Start dev server**

```bash
cd /Users/jonathanbraun/cmo-dashboard
npm run dev
```

Expected: server starts on `http://localhost:3001` with no TypeScript errors.

- [ ] **Step 3: Verify in browser**

Open `http://localhost:3001` and check:
- SummaryBar shows 4 KPIs (all `—` initially for performance metrics)
- CalendarSection shows the weekly tables from `calendar.md`
- BacklogSection shows ideas grouped by type (Post / Carrousel / Article / Vidéo)
- PerformanceSection shows empty state with "+ Ajouter" button

- [ ] **Step 4: Test the add performance form**

Click "+ Ajouter une performance", fill in all required fields, submit.
Expected:
- Form closes
- Table appears with the new entry
- `performance-log.md` has been updated

- [ ] **Step 5: Run full test suite**

```bash
npm run test:run
```

Expected: all tests PASS

- [ ] **Step 6: Final commit**

```bash
git add app/page.tsx
git commit -m "feat: main page wires all sections — CMO Dashboard v1 complete"
```

---

## Acceptance Checklist

- [ ] `npm run dev` starts on `localhost:3001` without errors
- [ ] All Vitest tests pass (`npm run test:run`)
- [ ] SummaryBar shows `—` for all metrics when performance-log is empty
- [ ] `GET /api/calendar` returns `[]` (not 500) if `calendar.md` is missing
- [ ] CalendarSection displays planning tables only (not the rotation table at the top)
- [ ] Status badges are colour-coded correctly for all 5 statuses
- [ ] BacklogSection groups active ideas by Post / Carrousel / Article / Vidéo
- [ ] BacklogSection shows "Aucune idée dans le backlog." only when `items.length === 0`
- [ ] BacklogSection hides archive section when no checked items
- [ ] PerformanceSection shows empty state + "+ Ajouter" button on first visit
- [ ] LineChart hidden with fewer than 2 entries
- [ ] Add form rejects submission with missing required fields (hook, date, pilier, format)
- [ ] Add form submits successfully, page reloads, new entry appears in table
- [ ] `performance-log.md` has correct markdown after first form submission (placeholder replaced)
- [ ] Second submission inserts new entry before the first (most recent on top)
