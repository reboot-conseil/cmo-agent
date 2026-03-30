# Admin — Usage par utilisateur — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter dans la page `/admin` un tableau listant tous les utilisateurs avec leur consommation tokens du mois courant.

**Architecture:** Vercel Blob stocke les fichiers `{userId}/usage/{YYYY-MM}.json`. On liste tous les blobs, on filtre ceux qui matchent le mois courant, on extrait les userIds et leurs données. La fonction `listAllUsersUsage` est ajoutée dans `lib/usage.ts`, puis `AdminPanel.tsx` est mis à jour pour accepter la nouvelle prop, et enfin `admin/page.tsx` appelle la fonction et passe les données.

**Tech Stack:** Next.js App Router, TypeScript, `@vercel/blob` (list), React

---

## File Map

| Fichier | Action | Ordre |
|---------|--------|-------|
| `dashboard/lib/usage.ts` | Ajouter `listAllUsersUsage` | 1 |
| `dashboard/components/AdminPanel.tsx` | Ajouter prop + tableau utilisateurs | 2 |
| `dashboard/app/admin/page.tsx` | Appeler `listAllUsersUsage` et passer à AdminPanel | 3 |

---

## Task 1: Ajouter `listAllUsersUsage` dans `lib/usage.ts`

**Files:**
- Modify: `dashboard/lib/usage.ts`

- [ ] **Step 1: Ajouter l'import `list` depuis `@vercel/blob`**

En haut de `dashboard/lib/usage.ts`, remplacer :
```ts
import { storageGet, storagePut } from './storage'
```
Par :
```ts
import { list } from '@vercel/blob'
import { storageGet, storagePut } from './storage'
```

- [ ] **Step 2: Ajouter le type `UserUsageSummary` et la fonction `listAllUsersUsage` à la fin du fichier**

Ajouter après la dernière fonction `setUserLimit` :

```ts
export interface UserUsageSummary {
  userId: string
  tokensUsed: number
  requestCount: number
  limit: number
}

/**
 * Admin only — list all users' usage for a given month.
 * Scans Vercel Blob for all {userId}/usage/{month}.json blobs.
 * Returns results sorted by tokensUsed descending.
 */
export async function listAllUsersUsage(month = currentMonth()): Promise<UserUsageSummary[]> {
  const suffix = `usage/${month}.json`
  const { blobs } = await list()

  const userIds = blobs
    .filter(b => b.pathname.endsWith(suffix))
    .map(b => b.pathname.split('/')[0])
    .filter((id, i, arr) => arr.indexOf(id) === i) // deduplicate

  const summaries = await Promise.all(
    userIds.map(async (userId): Promise<UserUsageSummary> => {
      const [usage, lim] = await Promise.all([
        readUsage(userId, month),
        readLimit(userId),
      ])
      return { userId, ...usage, limit: lim }
    })
  )

  return summaries.sort((a, b) => b.tokensUsed - a.tokensUsed)
}
```

- [ ] **Step 3: Vérifier TypeScript**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx tsc --noEmit
```

Expected: 0 erreurs

- [ ] **Step 4: Commit**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && git add lib/usage.ts && git commit -m "feat: add listAllUsersUsage to usage lib"
```

---

## Task 2: Mettre à jour `AdminPanel.tsx`

**Files:**
- Modify: `dashboard/components/AdminPanel.tsx`

- [ ] **Step 1: Remplacer le fichier entier**

```tsx
'use client'

import { useState } from 'react'

interface UsageSummary {
  month: string
  tokensUsed: number
  requestCount: number
  limit: number
}

interface UserUsageSummary {
  userId: string
  tokensUsed: number
  requestCount: number
  limit: number
}

export function AdminPanel({
  history,
  allUsersUsage,
}: {
  history: UsageSummary[]
  allUsersUsage: UserUsageSummary[]
}) {
  const current = history[0]
  const [limit, setLimit] = useState(String(current?.limit ?? 50000))
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const pct = current ? Math.round((current.tokensUsed / current.limit) * 100) : 0

  async function handleSetLimit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    const res = await fetch('/api/admin/set-limit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthlyTokenLimit: Number(limit) }),
    })
    setSaving(false)
    setMsg(res.ok ? 'Limite mise à jour.' : 'Erreur.')
  }

  return (
    <div style={{ maxWidth: 720, margin: '48px auto', padding: '0 24px', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 32 }}>Admin — Usage</h1>

      {current && (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, marginBottom: 32 }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Mois courant — {current.month}</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{current.tokensUsed.toLocaleString('fr')} tokens</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            {pct}% de la limite ({current.limit.toLocaleString('fr')}) · {current.requestCount} requêtes
          </div>
          <div style={{ marginTop: 12, height: 8, background: '#e5e7eb', borderRadius: 4 }}>
            <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: pct > 90 ? '#ef4444' : '#3b82f6', borderRadius: 4 }} />
          </div>
        </div>
      )}

      <form onSubmit={handleSetLimit} style={{ marginBottom: 40, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Limite mensuelle (tokens)</label>
          <input
            type="number"
            value={limit}
            onChange={e => setLimit(e.target.value)}
            min={1000}
            style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 12px', fontSize: 14, width: 160 }}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          style={{ padding: '8px 20px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? '…' : 'Enregistrer'}
        </button>
        {msg && <span style={{ fontSize: 13, color: '#6b7280' }}>{msg}</span>}
      </form>

      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Historique (6 mois)</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 40 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left', color: '#6b7280' }}>
            <th style={{ padding: '8px 12px' }}>Mois</th>
            <th style={{ padding: '8px 12px' }}>Tokens</th>
            <th style={{ padding: '8px 12px' }}>Requêtes</th>
            <th style={{ padding: '8px 12px' }}>% limite</th>
          </tr>
        </thead>
        <tbody>
          {history.map(row => (
            <tr key={row.month} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '8px 12px' }}>{row.month}</td>
              <td style={{ padding: '8px 12px' }}>{row.tokensUsed.toLocaleString('fr')}</td>
              <td style={{ padding: '8px 12px' }}>{row.requestCount}</td>
              <td style={{ padding: '8px 12px' }}>{Math.round((row.tokensUsed / row.limit) * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Utilisateurs — mois courant</h2>
      {allUsersUsage.length === 0 ? (
        <p style={{ fontSize: 13, color: '#6b7280' }}>Aucun utilisateur ce mois.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left', color: '#6b7280' }}>
              <th style={{ padding: '8px 12px' }}>Utilisateur</th>
              <th style={{ padding: '8px 12px' }}>Tokens</th>
              <th style={{ padding: '8px 12px' }}>Requêtes</th>
              <th style={{ padding: '8px 12px' }}>% limite</th>
            </tr>
          </thead>
          <tbody>
            {allUsersUsage.map(row => (
              <tr key={row.userId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12 }}>
                  {row.userId.slice(0, 14)}…
                </td>
                <td style={{ padding: '8px 12px' }}>{row.tokensUsed.toLocaleString('fr')}</td>
                <td style={{ padding: '8px 12px' }}>{row.requestCount}</td>
                <td style={{ padding: '8px 12px' }}>{Math.round((row.tokensUsed / row.limit) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
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
cd /Users/jonathanbraun/cmo-agent/dashboard && git add components/AdminPanel.tsx && git commit -m "feat: add per-user usage table in admin panel"
```

---

## Task 3: Mettre à jour `app/admin/page.tsx`

**Files:**
- Modify: `dashboard/app/admin/page.tsx`

- [ ] **Step 1: Remplacer le fichier entier**

```tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUsageSummary, listAllUsersUsage } from '@/lib/usage'
import { AdminPanel } from '@/components/AdminPanel'

const ADMIN_USER_ID = process.env.ADMIN_USER_ID ?? 'jonathan'

export default async function AdminPage() {
  const { userId } = await auth()
  if (!userId || userId !== ADMIN_USER_ID) redirect('/')

  const now = new Date()
  const months: string[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(d.toISOString().slice(0, 7))
  }
  const [history, allUsersUsage] = await Promise.all([
    Promise.all(months.map(m => getUsageSummary(userId, m))),
    listAllUsersUsage(),
  ])

  return <AdminPanel history={history} allUsersUsage={allUsersUsage} />
}
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx tsc --noEmit
```

Expected: 0 erreurs

- [ ] **Step 3: Lancer les tests**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npx vitest run
```

Expected: tous les tests passent

- [ ] **Step 4: Build de production**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && npm run build
```

Expected: build réussi, 0 erreurs

- [ ] **Step 5: Commit et push**

```bash
cd /Users/jonathanbraun/cmo-agent/dashboard && git add app/admin/page.tsx && git commit -m "feat: wire listAllUsersUsage to admin page"
cd /Users/jonathanbraun/cmo-agent/dashboard && git push origin main
```
