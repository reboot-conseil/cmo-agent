# Admin Sidebar — Design Spec

**Date:** 2026-03-30
**Statut:** Approuvé

---

## Contexte

Le dashboard dispose d'une page `/admin` (usage API + limite mensuelle tokens) et de routes `/api/admin/*` déjà protégées par Clerk + vérification `ADMIN_USER_ID`. Le lien vers cette page n'apparaît nulle part dans l'interface — l'accès se fait uniquement en tapant l'URL directement. Ce spec ajoute le lien dans la sidebar, visible uniquement pour l'utilisateur admin.

---

## Périmètre

**Dans le scope :**
- Affichage conditionnel du lien "Admin" dans la sidebar
- Transmission de `isAdmin` depuis chaque page server component vers `<Sidebar>`

**Hors scope :**
- `/onboarding` — reste accessible à tous les utilisateurs authentifiés (flow onboarding nouveaux comptes)
- `/sign-in`, `/sign-up` — pages Clerk publiques, non modifiées
- `/admin` page, middleware, `/api/admin/*` — déjà protégés, aucun changement

---

## Architecture

### Approche

Option A : prop `isAdmin` passée depuis chaque page (server component) vers `<Sidebar>`.

Chaque page vérifie côté serveur si l'utilisateur connecté est admin, et transmet cette information à la Sidebar. Pas de layout partagé à créer, pas d'exposition de données dans le bundle public.

### Flux de données

```
Page (server component)
  → auth()                          [Clerk server-side]
  → userId === ADMIN_USER_ID        [process.env, jamais exposé au client]
  → isAdmin: boolean
  → <Sidebar isAdmin={isAdmin} />
  → item "Admin" conditionnel
```

---

## Fichiers modifiés (5 fichiers, aucun nouveau)

### `dashboard/components/Sidebar.tsx`

- Ajoute prop `isAdmin?: boolean` (défaut `false`)
- Quand `isAdmin === true` : affiche un diviseur + item `{ href: '/admin', label: 'Admin', icon: '⚙' }` en bas de la nav
- Item admin stylistiquement distinct (couleur muted, séparé de la nav principale)

### Pages (4 fichiers)

Chaque page ajoute :

```ts
import { auth } from '@clerk/nextjs/server'

const { userId } = await auth()
const isAdmin = userId === (process.env.ADMIN_USER_ID ?? '')
```

Et modifie le rendu :

```tsx
<Sidebar isAdmin={isAdmin} />
```

Pages concernées :
- `app/calendrier/page.tsx`
- `app/campagnes/page.tsx`
- `app/cette-semaine/page.tsx`
- `app/strategie/page.tsx`

---

## Sécurité

- `ADMIN_USER_ID` est une variable d'environnement serveur — jamais exposée dans le bundle client
- La page `/admin` redirige déjà vers `/` si `userId !== ADMIN_USER_ID`
- Les routes `/api/admin/*` retournent déjà 403 si non-admin
- Le lien conditionnel dans la sidebar est cosmétique : même si un utilisateur connaît l'URL, la page et les API bloquent l'accès

---

## Résultat attendu

- Un utilisateur non-admin voit 5 items dans la sidebar (Cette semaine, Campagnes, Stratégie, Calendrier, Performances)
- L'admin voit ces 5 items + un item "Admin" séparé en bas
- Naviguer vers `/admin` depuis la sidebar fonctionne normalement pour l'admin
- Aucun autre comportement n'est modifié
