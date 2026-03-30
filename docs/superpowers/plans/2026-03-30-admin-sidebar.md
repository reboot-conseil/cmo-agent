# Admin Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher le lien "Admin" dans la sidebar uniquement pour l'utilisateur admin (ADMIN_USER_ID), en passant `isAdmin` depuis chaque page server component.

**Architecture:** Option A — prop `isAdmin?: boolean` passée depuis chaque page (server component) vers `<Sidebar>`. `cette-semaine/page.tsx` étant un client component, on extrait le contenu dans `CetteSemaineClient.tsx` et on crée un wrapper server component `page.tsx`. Aucun nouveau fichier créé pour les 4 autres pages.

**Tech Stack:** Next.js App Router, Clerk (`@clerk/nextjs/server`), TypeScript, React

---

## File Map

| Fichier | Action |
|---------|--------|
| `dashboard/components/Sidebar.tsx` | Modifier — ajouter prop `isAdmin`, item conditionnel |
| `dashboard/app/calendrier/page.tsx` | Modifier — ajouter `isAdmin`, passer à Sidebar |
| `dashboard/app/campagnes/page.tsx` | Modifier — ajouter `isAdmin`, passer à Sidebar |
| `dashboard/app/strategie/page.tsx` | Modifier — ajouter `isAdmin`, passer à Sidebar |
| `dashboard/app/cette-semaine/page.tsx` | Modifier — transformer en server wrapper |
| `dashboard/app/cette-semaine/CetteSemaineClient.tsx` | Créer — extraire le contenu client actuel |

---

## Task 1: Mettre à jour Sidebar.tsx

**Files:**
- Modify: `dashboard/components/Sidebar.tsx`

- [ ] **Step 1: Remplacer le contenu de Sidebar.tsx**

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/cette-semaine', label: 'Cette semaine', icon: '◎' },
  { href: '/campagnes', label: 'Campagnes', icon: '◈' },
  { href: '/strategie', label: 'Stratégie', icon: '⊕' },
  { href: '/calendrier', label: 'Calendrier', icon: '⊞' },
  { href: '/performances', label: 'Performances', icon: '↑' },
]

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
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
      {isAdmin && (
        <>
          <div style={{ margin: '8px 20px', borderTop: '1px solid var(--color-border)' }} />
          <Link href="/admin"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 20px', fontSize: 13, fontWeight: 500, textDecoration: 'none',
              background: pathname === '/admin' ? 'var(--color-primary-light)' : 'transparent',
              color: pathname === '/admin' ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }}>
            <span>⚙</span>Admin
          </Link>
        </>
      )}
    </nav>
  )
}
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx tsc --noEmit
```

Expected: 0 erreurs

- [ ] **Step 3: Commit**

```bash
git add components/Sidebar.tsx
git commit -m "feat: add conditional admin link in sidebar"
```

---

## Task 2: Mettre à jour calendrier/page.tsx

**Files:**
- Modify: `dashboard/app/calendrier/page.tsx`

Note: cette page appelle déjà `auth()` et dispose de `userId`.

- [ ] **Step 1: Ajouter isAdmin et le passer à Sidebar**

Remplacer :
```tsx
export default async function CalendrierPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
```

Par :
```tsx
const ADMIN_USER_ID = process.env.ADMIN_USER_ID ?? ''

export default async function CalendrierPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  const isAdmin = userId === ADMIN_USER_ID
```

Et remplacer `<Sidebar />` par `<Sidebar isAdmin={isAdmin} />`.

- [ ] **Step 2: Vérifier TypeScript**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx tsc --noEmit
```

Expected: 0 erreurs

- [ ] **Step 3: Commit**

```bash
git add app/calendrier/page.tsx
git commit -m "feat: pass isAdmin to Sidebar in calendrier page"
```

---

## Task 3: Mettre à jour campagnes/page.tsx

**Files:**
- Modify: `dashboard/app/campagnes/page.tsx`

Note: cette page appelle déjà `auth()` et dispose de `userId`.

- [ ] **Step 1: Ajouter isAdmin et le passer à Sidebar**

Remplacer :
```tsx
export default async function CampagnesPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  const campaigns = await listCampaigns(userId)
```

Par :
```tsx
const ADMIN_USER_ID = process.env.ADMIN_USER_ID ?? ''

export default async function CampagnesPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  const isAdmin = userId === ADMIN_USER_ID
  const campaigns = await listCampaigns(userId)
```

Et remplacer `<Sidebar />` par `<Sidebar isAdmin={isAdmin} />`.

- [ ] **Step 2: Vérifier TypeScript**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx tsc --noEmit
```

Expected: 0 erreurs

- [ ] **Step 3: Commit**

```bash
git add app/campagnes/page.tsx
git commit -m "feat: pass isAdmin to Sidebar in campagnes page"
```

---

## Task 4: Mettre à jour strategie/page.tsx

**Files:**
- Modify: `dashboard/app/strategie/page.tsx`

Note: cette page appelle déjà `auth()` et dispose de `userId`.

- [ ] **Step 1: Ajouter isAdmin et le passer à Sidebar**

Ajouter après les imports existants :
```tsx
const ADMIN_USER_ID = process.env.ADMIN_USER_ID ?? ''
```

Dans la fonction, après `const { userId } = await auth()` et le redirect, ajouter :
```tsx
const isAdmin = userId === ADMIN_USER_ID
```

Et remplacer `<Sidebar />` par `<Sidebar isAdmin={isAdmin} />`.

- [ ] **Step 2: Vérifier TypeScript**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx tsc --noEmit
```

Expected: 0 erreurs

- [ ] **Step 3: Commit**

```bash
git add app/strategie/page.tsx
git commit -m "feat: pass isAdmin to Sidebar in strategie page"
```

---

## Task 5: Splitter cette-semaine/page.tsx

**Files:**
- Create: `dashboard/app/cette-semaine/CetteSemaineClient.tsx`
- Modify: `dashboard/app/cette-semaine/page.tsx`

`cette-semaine/page.tsx` est actuellement un client component (`'use client'`). On ne peut pas y appeler `auth()`. Solution : extraire le contenu client dans `CetteSemaineClient.tsx`, transformer `page.tsx` en server component.

- [ ] **Step 1: Créer CetteSemaineClient.tsx**

Créer `dashboard/app/cette-semaine/CetteSemaineClient.tsx` avec le contenu suivant (le corps complet de l'actuel `page.tsx`, renommé) :

```tsx
'use client'
import { useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { NoteVocalePanel } from '@/components/NoteVocalePanel'
import { VeillePanel } from '@/components/VeillePanel'
import { WeeklyPlanPanel } from '@/components/WeeklyPlanPanel'
import { QuickPostPanel } from '@/components/QuickPostPanel'
import type { VeilleItem, WeeklyPlan, WeeklyPost } from '@/lib/types'

export function CetteSemaineClient({ isAdmin }: { isAdmin: boolean }) {
  const [noteVocale, setNoteVocale] = useState('')
  const [veille, setVeille] = useState<VeilleItem[]>([])
  const [veilleLoading, setVeilleLoading] = useState(false)
  const [plan, setPlan] = useState<WeeklyPlan | null>(null)
  const [planLoading, setPlanLoading] = useState(false)

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
    } catch (e) {
      console.error('Plan error:', e)
    } finally {
      setPlanLoading(false)
    }
  }

  async function handleValidate(post: WeeklyPost) {
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
    } catch (e) {
      console.error('Validate error:', e)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar isAdmin={isAdmin} />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
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
          <QuickPostPanel />
        </div>
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
          <WeeklyPlanPanel
            plan={plan}
            loading={planLoading}
            onGenerate={handleGeneratePlan}
            onValidate={handleValidate}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Remplacer page.tsx par un server wrapper**

Remplacer l'intégralité de `dashboard/app/cette-semaine/page.tsx` par :

```tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { CetteSemaineClient } from './CetteSemaineClient'

const ADMIN_USER_ID = process.env.ADMIN_USER_ID ?? ''

export default async function CetteSemainePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  const isAdmin = userId === ADMIN_USER_ID
  return <CetteSemaineClient isAdmin={isAdmin} />
}
```

- [ ] **Step 3: Vérifier TypeScript**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx tsc --noEmit
```

Expected: 0 erreurs

- [ ] **Step 4: Commit**

```bash
git add app/cette-semaine/page.tsx app/cette-semaine/CetteSemaineClient.tsx
git commit -m "feat: pass isAdmin to Sidebar in cette-semaine page"
```

---

## Task 6: Vérification finale

- [ ] **Step 1: Lancer les tests existants**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx vitest run
```

Expected: tous les tests passent (les tests existants sont des tests lib, non affectés par ces changements)

- [ ] **Step 2: Build de production**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npm run build
```

Expected: build réussi, 0 erreurs

- [ ] **Step 3: Vérifier visuellement**

Démarrer le serveur : `npm run dev`

- Ouvrir `localhost:3001/cette-semaine` — vérifier que la sidebar se charge sans erreur
- Se connecter avec un compte non-admin : 5 items nav, pas de lien Admin
- Se connecter avec le compte admin : 5 items nav + diviseur + "⚙ Admin"
- Cliquer "Admin" → naviguer vers `/admin` correctement

- [ ] **Step 4: Commit final si build clean**

```bash
git add .
git commit -m "chore: verify admin sidebar build"
```
