# Multi-User Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le dashboard CMO multi-utilisateurs avec Clerk (auth), Vercel Blob (données isolées par user), Vercel KV (limites API), et un admin panel pour Jonathan.

**Architecture:** Chaque lib function reçoit `userId` extrait une fois à la frontière route via `auth()` de Clerk. `lib/storage.ts` remplace tous les appels `fs` par des opérations Vercel Blob namespaced `{userId}/{path}`. `lib/usage.ts` wrappe chaque appel Anthropic avec un check/record de tokens dans Vercel KV.

**Tech Stack:** `@clerk/nextjs`, `@vercel/blob`, `@vercel/kv`, Next.js App Router, Vitest

**Spec:** `docs/superpowers/specs/2026-03-24-multi-user-design.md`

---

## File Map

### Nouveaux fichiers
- `dashboard/middleware.ts` — Clerk middleware, protège toutes les routes
- `dashboard/lib/storage.ts` — abstraction Vercel Blob (get/put/delete/list)
- `dashboard/lib/usage.ts` — Vercel KV : check + record tokens par user/mois
- `dashboard/lib/usage.test.ts` — tests usage
- `dashboard/app/(auth)/sign-in/[[...sign-in]]/page.tsx` — page Clerk sign-in
- `dashboard/app/(auth)/sign-up/[[...sign-up]]/page.tsx` — page Clerk sign-up
- `dashboard/app/admin/page.tsx` — admin panel (server component)
- `dashboard/app/api/admin/users/route.ts` — GET liste users + usage
- `dashboard/app/api/admin/users/[userId]/limit/route.ts` — PATCH limite tokens
- `dashboard/app/api/admin/users/[userId]/ban/route.ts` — POST ban + revoke sessions
- `dashboard/app/onboarding/page.tsx` — first-login onboarding
- `dashboard/app/api/onboarding/route.ts` — POST génère identity.md
- `scripts/migrate-to-blob.ts` — migration one-shot données locales → Blob

### Fichiers modifiés
- `dashboard/lib/parse-ideas.ts` — readIdea/writeIdea/deleteIdea/listIdeas reçoivent `userId`
- `dashboard/lib/parse-campaigns.ts` — idem pour campaigns
- `dashboard/lib/vision.ts` — readVision/saveVision/saveNote reçoivent `userId`
- `dashboard/lib/generation-log.ts` — reçoit `userId`
- `dashboard/lib/calendar-sync.ts` — reçoit `userId`
- `dashboard/lib/generate-vision.ts` — reçoit `userId`, lit `config/identity.md` depuis Blob
- `dashboard/lib/generate-strategy.ts` — reçoit `userId`
- `dashboard/lib/generate-campaign.ts` — reçoit `userId`
- `dashboard/lib/generate-quick-post.ts` — reçoit `userId`
- `dashboard/lib/generate-weekly-plan.ts` — reçoit `userId`
- `dashboard/lib/generate-veille.ts` — reçoit `userId`
- `dashboard/app/api/ideas/route.ts` — extrait userId via auth()
- `dashboard/app/api/ideas/[slug]/route.ts` — idem
- `dashboard/app/api/campagnes/route.ts` — idem
- `dashboard/app/api/campagnes/[slug]/route.ts` — idem
- `dashboard/app/api/campagnes/generate/route.ts` — idem + usage tracking
- `dashboard/app/api/strategy/generate-vision/route.ts` — idem + usage
- `dashboard/app/api/strategy/generate-plan/route.ts` — idem + usage
- `dashboard/app/api/strategy/save-note/route.ts` — idem
- `dashboard/app/api/strategy/update-log/route.ts` — idem
- `dashboard/app/api/generate/route.ts` — idem + usage
- `dashboard/app/api/cette-semaine/veille/route.ts` — idem + usage
- `dashboard/app/api/cette-semaine/generate/route.ts` — idem + usage
- `dashboard/app/api/cette-semaine/validate/route.ts` — idem
- `dashboard/app/api/cette-semaine/quick-post/route.ts` — idem + usage
- `dashboard/app/api/calendar/route.ts` — idem
- `dashboard/next.config.ts` — env vars Clerk
- `dashboard/package.json` — nouvelles dépendances

---

## Task 1 : Dépendances + variables d'environnement

**Files:**
- Modify: `dashboard/package.json`
- Modify: `dashboard/next.config.ts`
- Create: `dashboard/.env.local.example`

- [ ] **Step 1: Installer les dépendances**

```bash
cd dashboard && npm install @clerk/nextjs @vercel/blob @vercel/kv
```

- [ ] **Step 2: Créer `.env.local.example`** (jamais commité, sert de référence)

```bash
# dashboard/.env.local.example
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
ADMIN_USER_ID=user_...

BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

KV_URL=redis://...
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...

ANTHROPIC_API_KEY=sk-ant-...
CMO_BASE=/Users/jonathanbraun/cmo-agent
```

- [ ] **Step 3: Vérifier que les types compilent**

```bash
cd dashboard && npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
cd dashboard && git add package.json package-lock.json
git commit -m "chore: add @clerk/nextjs @vercel/blob @vercel/kv dependencies"
```

---

## Task 2 : `lib/storage.ts` — abstraction Vercel Blob

**Files:**
- Create: `dashboard/lib/storage.ts`

> Pas de tests unitaires pour ce fichier — c'est un thin wrapper autour de @vercel/blob. Testé indirectement via les tests d'intégration des lib qui l'utilisent.

- [ ] **Step 1: Créer `lib/storage.ts`**

```typescript
// dashboard/lib/storage.ts
import { put, del, list } from '@vercel/blob'

function blobPath(userId: string, relativePath: string): string {
  return `${userId}/${relativePath}`
}

export async function storageGet(userId: string, relativePath: string): Promise<string | null> {
  const prefix = blobPath(userId, relativePath)
  try {
    // list() avec prefix exact → récupère l'URL réelle du blob
    const { blobs } = await list({ prefix, limit: 1 })
    const blob = blobs.find(b => b.pathname === prefix)
    if (!blob) return null
    const res = await fetch(blob.url)
    if (!res.ok) return null
    return res.text()
  } catch {
    return null
  }
}

export async function storagePut(userId: string, relativePath: string, content: string): Promise<void> {
  await put(blobPath(userId, relativePath), content, {
    access: 'public',
    contentType: 'text/markdown; charset=utf-8',
    addRandomSuffix: false,
    allowOverwrite: true,
  })
}

export async function storageDelete(userId: string, relativePath: string): Promise<void> {
  try {
    const { blobs } = await list({ prefix: blobPath(userId, relativePath) })
    for (const blob of blobs) {
      await del(blob.url)
    }
  } catch { /* already gone */ }
}

export async function storageList(userId: string, prefix: string): Promise<string[]> {
  const fullPrefix = blobPath(userId, prefix)
  const { blobs } = await list({ prefix: fullPrefix })
  return blobs.map(b => b.pathname.replace(`${userId}/`, ''))
}
```

> `storageGet` utilise `list()` pour récupérer l'URL réelle du blob depuis les métadonnées Vercel Blob, puis `fetch` pour lire son contenu. C'est l'approche correcte — plus robuste que construire l'URL manuellement depuis un path.

- [ ] **Step 2: Vérifier TypeScript**

```bash
cd dashboard && npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
cd dashboard && git add lib/storage.ts
git commit -m "feat: add storage.ts Vercel Blob abstraction"
```

---

## Task 3 : Migrer `lib/parse-ideas.ts` → storage

**Files:**
- Modify: `dashboard/lib/parse-ideas.ts`
- Modify: `dashboard/lib/parse-ideas.test.ts`

> Les fonctions pures (slugify, parseIdeaFile, serializeIdea, etc.) ne changent pas. Seules les fonctions IO (readIdea, writeIdea, deleteIdea, listIdeas) changent.

- [ ] **Step 1: Écrire les tests failing pour les nouvelles signatures IO**

Ajouter dans `parse-ideas.test.ts` :

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest'
import * as storage from './storage'

vi.mock('./storage')

const mockStorage = storage as unknown as {
  storageGet: ReturnType<typeof vi.fn>
  storagePut: ReturnType<typeof vi.fn>
  storageDelete: ReturnType<typeof vi.fn>
  storageList: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('readIdea', () => {
  it('returns idea when blob exists', async () => {
    mockStorage.storageGet.mockResolvedValue(`---
slug: test-idea
sujet: Test
pilier: IA & Transformation
format: Post
statut: raw
semaine: null
jour: null
createdAt: 2026-01-01
---
`)
    const { readIdea } = await import('./parse-ideas')
    const idea = await readIdea('user_123', 'test-idea')
    expect(idea?.slug).toBe('test-idea')
    expect(mockStorage.storageGet).toHaveBeenCalledWith('user_123', 'content/ideas/test-idea.md')
  })

  it('returns null when blob does not exist', async () => {
    mockStorage.storageGet.mockResolvedValue(null)
    const { readIdea } = await import('./parse-ideas')
    const idea = await readIdea('user_123', 'missing')
    expect(idea).toBeNull()
  })
})

describe('writeIdea', () => {
  it('calls storagePut with correct path', async () => {
    mockStorage.storagePut.mockResolvedValue(undefined)
    const { writeIdea } = await import('./parse-ideas')
    const idea = { slug: 'my-idea', sujet: 'Test', pilier: 'IA & Transformation',
      format: 'Post' as const, statut: 'raw' as const, semaine: null, jour: null,
      createdAt: '2026-01-01', hook: '', texte: '', visuelType: '', visuelDescription: '', hashtags: [] }
    await writeIdea('user_123', idea)
    expect(mockStorage.storagePut).toHaveBeenCalledWith('user_123', 'content/ideas/my-idea.md', expect.any(String))
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd dashboard && npx vitest run lib/parse-ideas.test.ts
```
Expected: FAIL — les nouvelles signatures n'existent pas encore

- [ ] **Step 3: Mettre à jour les fonctions IO dans `parse-ideas.ts`**

Remplacer les imports `fs`/`path` et les 4 fonctions IO :

```typescript
// Supprimer :
// import fs from 'fs'
// import path from 'path'
// const CMO_BASE = ...
// const IDEAS_DIR = ...

// Ajouter :
import { storageGet, storagePut, storageDelete, storageList } from './storage'

const IDEAS_PREFIX = 'content/ideas'

export async function readIdea(userId: string, slug: string): Promise<Idea | null> {
  const content = await storageGet(userId, `${IDEAS_PREFIX}/${slug}.md`)
  if (!content) return null
  return parseIdeaFile(content, slug)
}

export async function writeIdea(userId: string, idea: Idea): Promise<void> {
  await storagePut(userId, `${IDEAS_PREFIX}/${idea.slug}.md`, serializeIdea(idea))
}

export async function deleteIdea(userId: string, slug: string): Promise<void> {
  await storageDelete(userId, `${IDEAS_PREFIX}/${slug}.md`)
}

export async function listIdeas(userId: string): Promise<Idea[]> {
  const paths = await storageList(userId, `${IDEAS_PREFIX}/`)
  const ideaPaths = paths.filter(p => p.endsWith('.md') && !p.includes('test-'))
  const ideas = await Promise.all(
    ideaPaths.map(async p => {
      const slug = p.replace(`${IDEAS_PREFIX}/`, '').replace('.md', '')
      return readIdea(userId, slug)
    })
  )
  return ideas
    .filter((i): i is Idea => i !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
```

- [ ] **Step 4: Run tests**

```bash
cd dashboard && npx vitest run lib/parse-ideas.test.ts
```
Expected: PASS (nouveaux tests) + PASS (tests pures existants inchangés)

- [ ] **Step 5: Commit**

```bash
cd dashboard && git add lib/parse-ideas.ts lib/parse-ideas.test.ts
git commit -m "feat: migrate parse-ideas.ts IO to Vercel Blob storage"
```

---

## Task 4 : Migrer `lib/parse-campaigns.ts` → storage

**Files:**
- Modify: `dashboard/lib/parse-campaigns.ts`
- Modify: `dashboard/lib/parse-campaigns.test.ts`

- [ ] **Step 1: Écrire les tests failing**

Ajouter dans `parse-campaigns.test.ts` :

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest'
import * as storage from './storage'
vi.mock('./storage')
const mockStorage = storage as any

beforeEach(() => vi.clearAllMocks())

describe('readCampaign', () => {
  it('returns campaign when blob exists', async () => {
    mockStorage.storageGet.mockResolvedValue(`---
slug: ma-campagne
titre: Ma Campagne
format: Post
duree: 5
objectif: Test
statut: active
createdAt: 2026-01-01
episodesSlug: []
contexte: test
---
`)
    const { readCampaign } = await import('./parse-campaigns')
    const c = await readCampaign('user_123', 'ma-campagne')
    expect(c?.slug).toBe('ma-campagne')
  })

  it('returns null when blob missing', async () => {
    mockStorage.storageGet.mockResolvedValue(null)
    const { readCampaign } = await import('./parse-campaigns')
    expect(await readCampaign('user_123', 'x')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify fail**

```bash
cd dashboard && npx vitest run lib/parse-campaigns.test.ts
```

- [ ] **Step 3: Mettre à jour les fonctions IO dans `parse-campaigns.ts`**

Remplacer les imports `fs`/`path` et les fonctions IO :

```typescript
// Supprimer les imports fs, path, CMO_BASE, CAMPAIGNS_DIR

import { storageGet, storagePut, storageDelete, storageList } from './storage'

const CAMPAIGNS_PREFIX = 'content/campagnes'

export async function readCampaign(userId: string, slug: string): Promise<Campaign | null> {
  const raw = await storageGet(userId, `${CAMPAIGNS_PREFIX}/${slug}.md`)
  if (!raw) return null
  return parseCampaignFile(raw)
}

export async function writeCampaign(userId: string, campaign: Campaign): Promise<void> {
  await storagePut(userId, `${CAMPAIGNS_PREFIX}/${campaign.slug}.md`, serializeCampaign(campaign))
}

export async function deleteCampaign(userId: string, slug: string): Promise<void> {
  await storageDelete(userId, `${CAMPAIGNS_PREFIX}/${slug}.md`)
}

export async function listCampaigns(userId: string): Promise<Campaign[]> {
  const paths = await storageList(userId, `${CAMPAIGNS_PREFIX}/`)
  const results = await Promise.all(
    paths.filter(p => p.endsWith('.md')).map(async p => {
      const slug = p.replace(`${CAMPAIGNS_PREFIX}/`, '').replace('.md', '')
      return readCampaign(userId, slug)
    })
  )
  return results.filter((c): c is Campaign => c !== null)
}
```

- [ ] **Step 4: Run tests**

```bash
cd dashboard && npx vitest run lib/parse-campaigns.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd dashboard && git add lib/parse-campaigns.ts lib/parse-campaigns.test.ts
git commit -m "feat: migrate parse-campaigns.ts IO to Vercel Blob storage"
```

---

## Task 5 : Migrer `lib/vision.ts`, `lib/generation-log.ts`, `lib/calendar-sync.ts`

**Files:**
- Modify: `dashboard/lib/vision.ts`
- Modify: `dashboard/lib/vision.test.ts`
- Modify: `dashboard/lib/generation-log.ts`
- Modify: `dashboard/lib/generation-log.test.ts`
- Modify: `dashboard/lib/calendar-sync.ts`
- Modify: `dashboard/lib/calendar-sync.test.ts`

- [ ] **Step 1: Mettre à jour `vision.ts`**

Remplacer les imports `fs` et les fonctions IO :

```typescript
// Supprimer imports fs, path, CMO_BASE, VISION_PATH

import { storageGet, storagePut } from './storage'

const VISION_PATH = 'content/strategy/vision.md'

export async function readVision(userId: string): Promise<VisionData> {
  try {
    const content = await storageGet(userId, VISION_PATH)
    if (!content) return { visionIA: null, noteJonathan: '', generatedAt: null }
    const visionIA = extractJsonFromVisionSection(content)
    const noteJonathan = extractNoteSection(content)
    const generatedAtMatch = content.match(/generatedAt:\s*(.+)/)
    const generatedAt = generatedAtMatch ? generatedAtMatch[1].trim() : null
    return { visionIA, noteJonathan, generatedAt }
  } catch {
    return { visionIA: null, noteJonathan: '', generatedAt: null }
  }
}

export async function saveVision(userId: string, vision: VisionResponse, generatedAt: string): Promise<void> {
  const existing = await storageGet(userId, VISION_PATH)
  const existingNote = existing ? extractNoteSection(existing) : ''
  await storagePut(userId, VISION_PATH, serializeVisionFile(vision, existingNote, generatedAt))
}

export async function saveNote(userId: string, note: string): Promise<void> {
  const content = await storageGet(userId, VISION_PATH)
  let vision: VisionResponse | null = null
  let generatedAt = ''
  if (content) {
    vision = extractJsonFromVisionSection(content)
    const m = content.match(/generatedAt:\s*(.+)/)
    generatedAt = m ? m[1].trim() : ''
  }
  if (vision) {
    await storagePut(userId, VISION_PATH, serializeVisionFile(vision, note, generatedAt))
  } else {
    const skeleton = `---\ngeneratedAt: ${generatedAt || 'n/a'}\n---\n\n## Vision IA\n\n## Note Jonathan\n\n${note}\n`
    await storagePut(userId, VISION_PATH, skeleton)
  }
}
```

- [ ] **Step 2: Mettre à jour `generation-log.ts`**

Lire le fichier d'abord, puis remplacer les appels `fs` par `storageGet`/`storagePut` avec `userId` en paramètre. Même pattern que vision.ts.

```typescript
// Ajouter userId: string comme premier paramètre à chaque fonction IO exportée
// Remplacer fs.readFile → storageGet(userId, 'content/strategy/generation-log.md')
// Remplacer fs.writeFile → storagePut(userId, 'content/strategy/generation-log.md', content)
```

- [ ] **Step 3: Mettre à jour `calendar-sync.ts`**

Même pattern :

```typescript
// Ajouter userId: string comme premier paramètre à syncCalendarFile
// Remplacer tous les appels fs par storageGet/storagePut/storageList avec le userId
// Le fichier calendar.md → storagePut(userId, 'content/calendar.md', content)
```

- [ ] **Step 4: Mettre à jour les tests pour ces 3 fichiers**

Dans chaque `.test.ts`, ajouter `vi.mock('./storage')` et passer `'user_123'` comme premier argument aux fonctions IO testées.

- [ ] **Step 5: Run tous les tests**

```bash
cd dashboard && npx vitest run lib/vision.test.ts lib/generation-log.test.ts lib/calendar-sync.test.ts
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd dashboard && git add lib/vision.ts lib/vision.test.ts lib/generation-log.ts lib/generation-log.test.ts lib/calendar-sync.ts lib/calendar-sync.test.ts
git commit -m "feat: migrate vision, generation-log, calendar-sync to Vercel Blob"
```

---

## Task 5b : Migrer `lib/generate-vision.ts` + `lib/generate-strategy.ts` → userId + identity.md

**Files:**
- Modify: `dashboard/lib/generate-vision.ts`
- Modify: `dashboard/lib/generate-strategy.ts`

Ces deux fichiers lisent `CLAUDE.md` via `fs.readFileSync(CLAUDE_MD_PATH)` — chemin hardcodé vers le fichier personnel de Jonathan. En multi-user, chaque user a son `{userId}/config/identity.md` dans Blob. De plus, ils appellent `readFullGenerationLog()`, `readIdeasSummaryFull()`, `readVision()` qui nécessiteront `userId` après Task 5.

- [ ] **Step 1: Mettre à jour `generate-vision.ts`**

Remplacer la lecture fs de CLAUDE.md par une lecture Blob de `config/identity.md` :

```typescript
// Supprimer :
// import fs from 'fs'
// import path from 'path'
// const CMO_BASE = ...
// const CLAUDE_MD_PATH = ...

import { storageGet } from './storage'

export async function generateVision(userId: string): Promise<VisionResponse> {
  const identityMd = await storageGet(userId, 'config/identity.md') ?? ''

  const [fullLog, ideasSummary, visionData] = await Promise.all([
    readFullGenerationLog(userId),   // userId ajouté en Task 5
    readIdeasSummaryFull(userId),    // userId ajouté ci-dessous
    readVision(userId),              // userId ajouté en Task 5
  ])
  // ... reste du code identique, remplacer claudeMd par identityMd dans le prompt
}
```

- [ ] **Step 2: Mettre à jour `generate-strategy.ts`**

Même pattern : ajouter `userId: string` comme premier paramètre à toutes les fonctions exportées. Passer `userId` aux appels `listIdeas(userId)`, `listCampaigns(userId)`, `readFullGenerationLog(userId)`.

```typescript
// Toutes les fonctions exportées reçoivent userId en premier paramètre :
export async function readIdeasSummaryFull(userId: string): Promise<string>
export async function generateStrategyPlan(userId: string, ...): Promise<...>
```

- [ ] **Step 3: Vérifier TypeScript**

```bash
cd dashboard && npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
cd dashboard && git add lib/generate-vision.ts lib/generate-strategy.ts
git commit -m "feat: migrate generate-vision and generate-strategy to per-user identity.md"
```

---

## Task 6 : Clerk setup — middleware + pages auth

**Files:**
- Create: `dashboard/middleware.ts`
- Create: `dashboard/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- Create: `dashboard/app/(auth)/sign-up/[[...sign-up]]/page.tsx`

> Nécessite de créer un compte Clerk et de récupérer les clés avant cette tâche.
> 1. Créer un projet sur clerk.com
> 2. Dans Clerk Dashboard → User & Authentication → Email, Phone, Username : activer **Email address** + **Email verification link** (magic link) ET **Password** (email/password)
> 3. Copier `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` et `CLERK_SECRET_KEY` dans `.env.local`
> 4. Copier ton `userId` Clerk dans `ADMIN_USER_ID` (visible dans le Clerk Dashboard → Users après ta première connexion)

- [ ] **Step 1: Créer `middleware.ts`**

```typescript
// dashboard/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
])

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

- [ ] **Step 2: Créer la page sign-in**

```typescript
// dashboard/app/(auth)/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  )
}
```

- [ ] **Step 3: Créer la page sign-up**

```typescript
// dashboard/app/(auth)/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp />
    </div>
  )
}
```

- [ ] **Step 4: Ajouter ClerkProvider dans `app/layout.tsx`**

```typescript
// Modifier app/layout.tsx — ajouter import et wrapper :
import { ClerkProvider } from '@clerk/nextjs'

// Wrapper le {children} :
<ClerkProvider>
  {children}
</ClerkProvider>
```

- [ ] **Step 5: Tester le démarrage**

```bash
cd dashboard && npm run dev
```
Expected: App démarre, visite `localhost:3001` redirige vers `/sign-in`

- [ ] **Step 6: Commit**

```bash
cd dashboard && git add middleware.ts app/\(auth\)/ app/layout.tsx
git commit -m "feat: add Clerk authentication middleware and sign-in/sign-up pages"
```

---

## Task 7 : Thread userId dans les routes API — ideas + campagnes

**Files:**
- Modify: `dashboard/app/api/ideas/route.ts`
- Modify: `dashboard/app/api/ideas/[slug]/route.ts`
- Modify: `dashboard/app/api/campagnes/route.ts`
- Modify: `dashboard/app/api/campagnes/[slug]/route.ts`

**Pattern standard pour chaque route :**

```typescript
import { auth } from '@clerk/nextjs/server'

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Passer userId à toutes les fonctions lib
  const ideas = await listIdeas(userId)
  return NextResponse.json(ideas)
}
```

- [ ] **Step 1: Mettre à jour `app/api/ideas/route.ts`**

Ajouter `import { auth } from '@clerk/nextjs/server'`. Extraire `userId` au début de chaque handler. Passer `userId` à `listIdeas(userId)` et `writeIdea(userId, idea)`.

- [ ] **Step 2: Mettre à jour `app/api/ideas/[slug]/route.ts`**

Même pattern. Passer `userId` à `readIdea`, `writeIdea`, `deleteIdea`, `syncCalendarFile`.

- [ ] **Step 3: Mettre à jour `app/api/campagnes/route.ts`**

Même pattern. Passer `userId` à `listCampaigns`, `writeCampaign`.

- [ ] **Step 4: Mettre à jour `app/api/campagnes/[slug]/route.ts`**

Même pattern. Passer `userId` à `readCampaign`, `writeCampaign`, `deleteCampaign`.

- [ ] **Step 5: Vérifier TypeScript**

```bash
cd dashboard && npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
cd dashboard && git add app/api/ideas/ app/api/campagnes/route.ts app/api/campagnes/\[slug\]/
git commit -m "feat: thread userId through ideas and campagnes API routes"
```

---

## Task 8 : Thread userId dans les routes API — strategy + cette-semaine + autres

**Files:**
- Modify: `dashboard/app/api/campagnes/generate/route.ts`
- Modify: `dashboard/app/api/strategy/generate-vision/route.ts`
- Modify: `dashboard/app/api/strategy/generate-plan/route.ts`
- Modify: `dashboard/app/api/strategy/save-note/route.ts`
- Modify: `dashboard/app/api/strategy/update-log/route.ts`
- Modify: `dashboard/app/api/generate/route.ts`
- Modify: `dashboard/app/api/cette-semaine/veille/route.ts`
- Modify: `dashboard/app/api/cette-semaine/generate/route.ts`
- Modify: `dashboard/app/api/cette-semaine/validate/route.ts`
- Modify: `dashboard/app/api/cette-semaine/quick-post/route.ts`
- Modify: `dashboard/app/api/calendar/route.ts`

- [ ] **Step 1: Mettre à jour les generate libs pour accepter `userId`**

Les libs `generate-campaign.ts`, `generate-quick-post.ts`, `generate-weekly-plan.ts`, `generate-veille.ts` appellent `listCampaigns()`, `listIdeas()`, `writeIdea()` etc. qui nécessitent maintenant `userId`. Ajouter `userId: string` comme premier paramètre à toutes leurs fonctions exportées :

```typescript
// generate-campaign.ts
export async function generateCampaign(userId: string, brief: ...): Promise<...>

// generate-quick-post.ts
export async function generateQuickPost(userId: string, sujet: string): Promise<...>

// generate-weekly-plan.ts
export async function generateWeeklyPlan(userId: string, req: ...): Promise<...>

// generate-veille.ts
export async function generateVeille(userId: string): Promise<...>
```

- [ ] **Step 2: Mettre à jour les 11 routes restantes**

Même pattern que Task 7 : `auth()` → `userId` → passer aux fonctions lib.

Pour `app/api/calendar/route.ts`, passer `userId` à `syncCalendarFile`.

Pour les routes `cette-semaine/*`, passer `userId` à `listCampaigns`, `writeIdea`, `generateWeeklyPlan`, `generateVeille`, etc.

- [ ] **Step 2: Vérifier TypeScript**

```bash
cd dashboard && npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Step 3: Run tous les tests**

```bash
cd dashboard && npx vitest run
```
Expected: tous passent (les tests pures ne sont pas affectés)

- [ ] **Step 4: Commit**

```bash
cd dashboard && git add app/api/
git commit -m "feat: thread userId through all remaining API routes"
```

---

## Task 9 : `lib/usage.ts` — Vercel KV usage tracking

**Files:**
- Create: `dashboard/lib/usage.ts`
- Create: `dashboard/lib/usage.test.ts`

- [ ] **Step 1: Écrire les tests**

```typescript
// dashboard/lib/usage.test.ts
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { kv } from '@vercel/kv'

vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
    hincrby: vi.fn(),
    hset: vi.fn(),
  }
}))

const mockKv = kv as unknown as {
  get: ReturnType<typeof vi.fn>
  hincrby: ReturnType<typeof vi.fn>
  hset: ReturnType<typeof vi.fn>
}

describe('checkUsage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('passes when under limit', async () => {
    mockKv.get.mockResolvedValueOnce({ tokensUsed: 10000, requestCount: 5 }) // usage
    mockKv.get.mockResolvedValueOnce(null) // no explicit limit → default
    const { checkUsage } = await import('./usage')
    await expect(checkUsage('user_123')).resolves.not.toThrow()
  })

  it('throws when at or over limit', async () => {
    mockKv.get.mockResolvedValueOnce({ tokensUsed: 50000, requestCount: 100 })
    mockKv.get.mockResolvedValueOnce(null)
    const { checkUsage } = await import('./usage')
    await expect(checkUsage('user_123')).rejects.toThrow('Budget mensuel')
  })

  it('uses explicit limit when set', async () => {
    mockKv.get.mockResolvedValueOnce({ tokensUsed: 80000, requestCount: 50 })
    mockKv.get.mockResolvedValueOnce({ monthlyTokenLimit: 100000 })
    const { checkUsage } = await import('./usage')
    await expect(checkUsage('user_123')).resolves.not.toThrow()
  })
})

describe('recordUsage', () => {
  it('increments usage in KV', async () => {
    mockKv.hincrby.mockResolvedValue(1000)
    const { recordUsage } = await import('./usage')
    await recordUsage('user_123', 500, 300)
    expect(mockKv.hincrby).toHaveBeenCalledTimes(2) // tokensUsed + requestCount
  })
})
```

- [ ] **Step 2: Run tests to verify fail**

```bash
cd dashboard && npx vitest run lib/usage.test.ts
```
Expected: FAIL — module n'existe pas

- [ ] **Step 3: Créer `lib/usage.ts`**

```typescript
// dashboard/lib/usage.ts
import { kv } from '@vercel/kv'

const DEFAULT_MONTHLY_TOKEN_LIMIT = 50_000

function monthKey(): string {
  return new Date().toISOString().slice(0, 7) // YYYY-MM
}

function usageKey(userId: string): string {
  return `usage:${userId}:${monthKey()}`
}

function limitsKey(userId: string): string {
  return `limits:${userId}`
}

interface UsageRecord {
  tokensUsed: number
  requestCount: number
}

interface LimitsRecord {
  monthlyTokenLimit: number
}

export async function checkUsage(userId: string): Promise<void> {
  const [usageRaw, limitsRaw] = await Promise.all([
    kv.get<UsageRecord>(usageKey(userId)),
    kv.get<LimitsRecord>(limitsKey(userId)),
  ])

  const tokensUsed = usageRaw?.tokensUsed ?? 0
  const limit = limitsRaw?.monthlyTokenLimit ?? DEFAULT_MONTHLY_TOKEN_LIMIT

  if (tokensUsed >= limit) {
    throw new Error(`Budget mensuel atteint (${tokensUsed}/${limit} tokens)`)
  }
}

export async function recordUsage(userId: string, inputTokens: number, outputTokens: number): Promise<void> {
  const key = usageKey(userId)
  const total = inputTokens + outputTokens
  await Promise.all([
    kv.hincrby(key, 'tokensUsed', total),
    kv.hincrby(key, 'requestCount', 1),
  ])
}

export async function getUsageSummary(userId: string, month?: string): Promise<{
  tokensUsed: number
  requestCount: number
  limit: number
}> {
  const key = month ? `usage:${userId}:${month}` : usageKey(userId)
  const [usageRaw, limitsRaw] = await Promise.all([
    kv.get<UsageRecord>(key),
    kv.get<LimitsRecord>(limitsKey(userId)),
  ])
  return {
    tokensUsed: usageRaw?.tokensUsed ?? 0,
    requestCount: usageRaw?.requestCount ?? 0,
    limit: limitsRaw?.monthlyTokenLimit ?? DEFAULT_MONTHLY_TOKEN_LIMIT,
  }
}

export async function setUserLimit(userId: string, monthlyTokenLimit: number): Promise<void> {
  await kv.set(limitsKey(userId), { monthlyTokenLimit })
}
```

- [ ] **Step 4: Run tests**

```bash
cd dashboard && npx vitest run lib/usage.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd dashboard && git add lib/usage.ts lib/usage.test.ts
git commit -m "feat: add usage.ts for per-user token tracking in Vercel KV"
```

---

## Task 10 : Intégrer usage tracking dans les routes generate

**Files:**
- Modify: `dashboard/app/api/campagnes/generate/route.ts`
- Modify: `dashboard/app/api/strategy/generate-vision/route.ts`
- Modify: `dashboard/app/api/strategy/generate-plan/route.ts`
- Modify: `dashboard/app/api/generate/route.ts`
- Modify: `dashboard/app/api/cette-semaine/veille/route.ts`
- Modify: `dashboard/app/api/cette-semaine/generate/route.ts`
- Modify: `dashboard/app/api/cette-semaine/quick-post/route.ts`

**Pattern standard :**

```typescript
import { checkUsage, recordUsage } from '@/lib/usage'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await checkUsage(userId)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 429 })
  }

  try {
    const response = await anthropic.messages.create({ /* ... */ })
    await recordUsage(userId, response.usage.input_tokens, response.usage.output_tokens)
    // ... retourner le résultat
  } catch (e) {
    // Ne pas recorder l'usage si l'appel échoue
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 1: Ajouter checkUsage + recordUsage aux routes campagnes + generate + strategy**

Routes : `campagnes/generate`, `strategy/generate-vision`, `strategy/generate-plan`, `app/api/generate`.

Pour chaque route : import checkUsage/recordUsage, ajouter le try/catch checkUsage avant l'appel Anthropic, ajouter recordUsage après la réponse Anthropic en utilisant `response.usage.input_tokens` et `response.usage.output_tokens`.

- [ ] **Step 2: Commit**

```bash
cd dashboard && git add app/api/campagnes/ app/api/strategy/ app/api/generate/
git commit -m "feat: add usage tracking to campagnes/strategy/generate routes"
```

- [ ] **Step 3: Ajouter checkUsage + recordUsage aux routes cette-semaine**

Routes : `cette-semaine/veille`, `cette-semaine/generate`, `cette-semaine/quick-post`.

- [ ] **Step 4: Vérifier TypeScript**

```bash
cd dashboard && npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
cd dashboard && git add app/api/cette-semaine/
git commit -m "feat: add usage tracking to cette-semaine generate routes"
```

---

## Task 11 : Admin panel

**Files:**
- Create: `dashboard/app/admin/page.tsx`
- Create: `dashboard/app/api/admin/users/route.ts`
- Create: `dashboard/app/api/admin/users/[userId]/limit/route.ts`
- Create: `dashboard/app/api/admin/users/[userId]/ban/route.ts`

- [ ] **Step 1: Créer les routes API admin**

```typescript
// dashboard/app/api/admin/users/route.ts
import { auth } from '@clerk/nextjs/server'
import { clerkClient } from '@clerk/nextjs/server'
import { getUsageSummary } from '@/lib/usage'
import { NextResponse } from 'next/server'

function isAdmin(userId: string) {
  return userId === process.env.ADMIN_USER_ID
}

export async function GET() {
  const { userId } = await auth()
  if (!userId || !isAdmin(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const client = await clerkClient()
  const { data: users } = await client.users.getUserList({ limit: 50 })

  const usersWithUsage = await Promise.all(
    users.map(async (user) => {
      const usage = await getUsageSummary(user.id)
      return {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress ?? '',
        firstName: user.firstName ?? '',
        banned: user.banned,
        tokensUsed: usage.tokensUsed,
        requestCount: usage.requestCount,
        limit: usage.limit,
      }
    })
  )

  return NextResponse.json(usersWithUsage)
}
```

```typescript
// dashboard/app/api/admin/users/[userId]/limit/route.ts
import { auth } from '@clerk/nextjs/server'
import { setUserLimit } from '@/lib/usage'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: adminId } = await auth()
  if (!adminId || adminId !== process.env.ADMIN_USER_ID) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId } = await params
  const { monthlyTokenLimit } = await request.json() as { monthlyTokenLimit: number }

  if (!Number.isInteger(monthlyTokenLimit) || monthlyTokenLimit < 0) {
    return NextResponse.json({ error: 'Invalid limit' }, { status: 400 })
  }

  await setUserLimit(userId, monthlyTokenLimit)
  return NextResponse.json({ ok: true })
}
```

```typescript
// dashboard/app/api/admin/users/[userId]/ban/route.ts
import { auth } from '@clerk/nextjs/server'
import { clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: adminId } = await auth()
  if (!adminId || adminId !== process.env.ADMIN_USER_ID) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId } = await params
  const client = await clerkClient()

  await client.users.banUser(userId)

  // Révoquer toutes les sessions actives
  const { data: sessions } = await client.sessions.getSessionList({ userId })
  await Promise.all(sessions.map(s => client.sessions.revokeSession(s.id)))

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Créer la page admin**

```typescript
// dashboard/app/admin/page.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import AdminDashboard from '@/components/AdminDashboard'

export default async function AdminPage() {
  const { userId } = await auth()
  if (!userId || userId !== process.env.ADMIN_USER_ID) {
    redirect('/')
  }
  return <AdminDashboard />
}
```

- [ ] **Step 3: Créer le composant `AdminDashboard`**

```typescript
// dashboard/components/AdminDashboard.tsx
'use client'
import { useEffect, useState } from 'react'

interface UserRow {
  id: string
  email: string
  firstName: string
  banned: boolean
  tokensUsed: number
  requestCount: number
  limit: number
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/users').then(r => r.json()).then(data => {
      setUsers(data)
      setLoading(false)
    })
  }, [])

  async function updateLimit(userId: string, limit: number) {
    await fetch(`/api/admin/users/${userId}/limit`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthlyTokenLimit: limit }),
    })
  }

  async function banUser(userId: string) {
    if (!confirm('Désactiver cet utilisateur ?')) return
    await fetch(`/api/admin/users/${userId}/ban`, { method: 'POST' })
    setUsers(u => u.map(x => x.id === userId ? { ...x, banned: true } : x))
  }

  if (loading) return <div className="p-8">Chargement...</div>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Admin — Utilisateurs</h1>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-4">Email</th>
            <th className="py-2 pr-4">Tokens ce mois</th>
            <th className="py-2 pr-4">Limite</th>
            <th className="py-2 pr-4">Statut</th>
            <th className="py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id} className="border-b">
              <td className="py-2 pr-4">{user.email}</td>
              <td className="py-2 pr-4">
                {user.tokensUsed.toLocaleString()}
                <span className="text-gray-400 ml-1">
                  ({Math.round(user.tokensUsed / user.limit * 100)}%)
                </span>
              </td>
              <td className="py-2 pr-4">
                <input
                  type="number"
                  defaultValue={user.limit}
                  className="w-24 border rounded px-1"
                  onBlur={e => updateLimit(user.id, parseInt(e.target.value))}
                />
              </td>
              <td className="py-2 pr-4">
                {user.banned
                  ? <span className="text-red-500">Banni</span>
                  : <span className="text-green-600">Actif</span>
                }
              </td>
              <td className="py-2">
                {!user.banned && (
                  <button
                    onClick={() => banUser(user.id)}
                    className="text-red-500 hover:underline text-sm"
                  >
                    Désactiver
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Vérifier TypeScript**

```bash
cd dashboard && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
cd dashboard && git add app/admin/ app/api/admin/ components/AdminDashboard.tsx
git commit -m "feat: add admin panel with user management and usage display"
```

---

## Task 12 : Script de migration des données existantes

**Files:**
- Create: `scripts/migrate-to-blob.ts`

- [ ] **Step 1: Créer le script**

```typescript
// scripts/migrate-to-blob.ts
import fs from 'fs'
import path from 'path'
import { put } from '@vercel/blob'

const CMO_BASE = process.env.CMO_BASE ?? '/Users/jonathanbraun/cmo-agent'
const ADMIN_USER_ID = process.env.ADMIN_USER_ID
const DRY_RUN = process.argv.includes('--dry-run')
const FORCE = process.argv.includes('--force')

// Support --userId=user_xxx pour migrer un user autre que ADMIN_USER_ID
const userIdArg = process.argv.find(a => a.startsWith('--userId='))
const TARGET_USER_ID = userIdArg ? userIdArg.split('=')[1] : ADMIN_USER_ID

if (!TARGET_USER_ID) {
  console.error('ADMIN_USER_ID env var or --userId=user_xxx flag is required')
  process.exit(1)
}

function walkDir(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath))
    } else {
      files.push(fullPath)
    }
  }
  return files
}

async function main() {
  const contentDir = path.join(CMO_BASE, 'content')
  const files = walkDir(contentDir)

  console.log(`Found ${files.length} files to migrate`)
  if (DRY_RUN) console.log('--- DRY RUN — no writes ---')

  let success = 0
  let errors = 0

  for (const filePath of files) {
    const relativePath = path.relative(CMO_BASE, filePath)
    const blobPath = `${TARGET_USER_ID}/${relativePath}`

    console.log(`${DRY_RUN ? '[DRY]' : '[PUT]'} ${blobPath}`)

    if (!DRY_RUN) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        await put(blobPath, content, {
          access: 'public',
          contentType: 'text/markdown; charset=utf-8',
          addRandomSuffix: false,
          allowOverwrite: FORCE,
        })
        success++
      } catch (e) {
        console.error(`  ERROR: ${e}`)
        errors++
      }
    }
  }

  console.log(`\nDone: ${success} uploaded, ${errors} errors`)
  if (DRY_RUN) console.log('Run without --dry-run to actually upload.')
}

main().catch(console.error)
```

- [ ] **Step 2: Test dry-run**

```bash
ADMIN_USER_ID=user_xxx BLOB_READ_WRITE_TOKEN=xxx npx tsx scripts/migrate-to-blob.ts --dry-run
```
Expected: affiche la liste des fichiers qui seraient uploadés, aucune écriture

- [ ] **Step 3: Commit**

```bash
git add scripts/migrate-to-blob.ts
git commit -m "feat: add migrate-to-blob.ts migration script with dry-run support"
```

---

## Task 13 : Onboarding first-login

**Files:**
- Create: `dashboard/app/onboarding/page.tsx`
- Create: `dashboard/app/api/onboarding/route.ts`
- Modify: `dashboard/app/layout.tsx` (ajouter redirect vers /onboarding si pas d'identity.md)

- [ ] **Step 1: Créer la route API onboarding**

```typescript
// dashboard/app/api/onboarding/route.ts
import { auth } from '@clerk/nextjs/server'
import { storagePut } from '@/lib/storage'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { nom, poste, entreprise, mission } = await request.json() as {
    nom: string
    poste: string
    entreprise: string
    mission: string
  }

  if (!nom?.trim() || !poste?.trim()) {
    return NextResponse.json({ error: 'nom et poste requis' }, { status: 400 })
  }

  const identityMd = `# Identité — ${nom}

## Poste
${poste}${entreprise ? ` — ${entreprise}` : ''}

## Mission éditoriale
${mission || 'À définir'}

## Piliers thématiques
- IA & Transformation (25%)
- Stratégie & Décision (20%)
- Business & ROI (20%)
- Neurosciences & Adoption (15%)
- Innovation & Prospective (10%)
- Coulisses & Authenticité (10%)

## Voix
Assertif mais humble. Enthousiaste mais ancré. Direct et structuré.
`

  await storagePut(userId, 'config/identity.md', identityMd)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Créer la page onboarding**

```typescript
// dashboard/app/onboarding/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router = useRouter()
  const [form, setForm] = useState({ nom: '', poste: '', entreprise: '', mission: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    router.push('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Bienvenue — configurons votre profil</h1>

        {[
          { key: 'nom', label: 'Votre prénom et nom', required: true },
          { key: 'poste', label: 'Votre poste', required: true },
          { key: 'entreprise', label: 'Votre entreprise', required: false },
          { key: 'mission', label: 'Votre mission éditoriale (en une phrase)', required: false },
        ].map(({ key, label, required }) => (
          <div key={key}>
            <label className="block text-sm font-medium mb-1">{label}</label>
            <input
              type="text"
              required={required}
              value={form[key as keyof typeof form]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        ))}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white rounded px-4 py-2 disabled:opacity-50"
        >
          {loading ? 'Création...' : 'Commencer'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Ajouter le check first-login dans le layout ou middleware**

Créer une server action ou modifier le layout pour vérifier l'existence de `config/identity.md` :

```typescript
// Dans app/layout.tsx (server component) — ajouter après auth check :
import { storageGet } from '@/lib/storage'
import { redirect } from 'next/navigation'

// Dans le body du layout (après ClerkProvider) :
// const { userId } = await auth()
// if (userId) {
//   const identity = await storageGet(userId, 'config/identity.md')
//   if (!identity && !pathname.startsWith('/onboarding')) redirect('/onboarding')
// }
```

> Note: utiliser `headers()` de next/headers pour récupérer le pathname dans le layout, ou gérer le redirect dans le middleware Clerk.

- [ ] **Step 4: Vérifier TypeScript**

```bash
cd dashboard && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
cd dashboard && git add app/onboarding/ app/api/onboarding/
git commit -m "feat: add first-login onboarding for new users"
```

---

## Task 14 : Run complet + vérification finale

- [ ] **Step 1: Run tous les tests**

```bash
cd dashboard && npx vitest run
```
Expected: tous passent

- [ ] **Step 2: Vérifier TypeScript**

```bash
cd dashboard && npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Step 3: Build de production**

```bash
cd dashboard && npm run build
```
Expected: build réussi, 0 erreurs

- [ ] **Step 4: Commit final**

```bash
cd dashboard && git add -A
git commit -m "chore: verify multi-user feature build and tests pass"
```

---

## Task 15 : Déploiement Vercel

> Cette task se fait dans le dashboard Vercel, pas dans le code.

- [ ] **Step 1: Créer les ressources Vercel**
  - Vercel Blob : Dashboard → Storage → Blob → Create store
  - Vercel KV : Dashboard → Storage → KV → Create database

- [ ] **Step 2: Configurer les variables d'environnement dans Vercel**

Ajouter dans Vercel Project Settings → Environment Variables :

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
ADMIN_USER_ID

BLOB_READ_WRITE_TOKEN        (auto-populated by Vercel Blob)
KV_URL                       (auto-populated by Vercel KV)
KV_REST_API_URL
KV_REST_API_TOKEN
KV_REST_API_READ_ONLY_TOKEN

ANTHROPIC_API_KEY
```

- [ ] **Step 3: Déployer**

```bash
cd dashboard && git push
```
Vercel déploie automatiquement depuis main.

- [ ] **Step 4: Migrer les données de Jonathan**

```bash
ADMIN_USER_ID=user_... BLOB_READ_WRITE_TOKEN=... npx tsx scripts/migrate-to-blob.ts --dry-run
# Vérifier la liste, puis :
ADMIN_USER_ID=user_... BLOB_READ_WRITE_TOKEN=... npx tsx scripts/migrate-to-blob.ts
```

- [ ] **Step 5: Vérifier le déploiement**
  - Visiter l'URL Vercel → redirige vers `/sign-in` ✓
  - Se connecter avec le compte Jonathan → accède au dashboard ✓
  - Visiter `/admin` → affiche le tableau users ✓
  - Générer un post → usage KV incrémenté ✓
