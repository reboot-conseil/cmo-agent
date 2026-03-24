# Design : Multi-utilisateurs, Admin Panel & Limites API

**Date :** 2026-03-24
**Scope :** 5-10 clients Reboot Conseil en phase test, déploiement Vercel
**Stack ajoutée :** Clerk (auth), Vercel Blob (fichiers), Vercel KV (usage)

---

## Contexte

L'outil CMO est actuellement un outil personnel pour Jonathan Braun (single-user, filesystem local, port 3001). L'objectif est de le rendre multi-utilisateurs pour des clients Reboot Conseil en phase test, déployé sur Vercel.

**Contraintes :**
- 5-10 utilisateurs max (phase test)
- Données existantes de Jonathan à migrer
- Clé Anthropic centralisée (gérée par Jonathan, limite par user)
- Accès simple : magic link ou email/password
- Admin panel pour Jonathan uniquement

---

## Architecture globale

```
┌─────────────────────────────────────────┐
│  Vercel (Next.js App Router)            │
│                                         │
│  Clerk middleware                       │
│  → protège toutes les routes            │
│  → expose userId dans chaque request   │
│                                         │
│  /admin  → réservé à ADMIN_USER_ID     │
│  /       → Cette semaine               │
│  /campagnes /calendrier …              │
└────────────────┬────────────────────────┘
                 │
       ┌─────────┼──────────┐
       ▼         ▼          ▼
  Clerk SaaS  Vercel Blob  Vercel KV
  (auth +     (fichiers    (usage +
   users)      /userId/)    limites)
```

---

## 1. Authentification (Clerk)

**Provider :** [Clerk](https://clerk.com) — free tier jusqu'à 10 000 MAU
**Méthodes supportées :** magic link (email) + email/password
**Gestion des utilisateurs :** dashboard Clerk (invitations, désactivation, pas de code à écrire)

**Middleware Next.js (`middleware.ts`) :**
- Toutes les routes protégées par défaut
- `userId` disponible dans chaque server action et API route via `auth()` de `@clerk/nextjs`
- Route `/admin` : vérification supplémentaire `userId === process.env.ADMIN_USER_ID`

**Variables d'environnement ajoutées :**
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
ADMIN_USER_ID=                    # userId Clerk de Jonathan
CLERK_WEBHOOK_SECRET=             # optionnel, pour synchro events
```

---

## 2. Isolation des données (Vercel Blob)

### Structure des paths

```
{userId}/content/ideas/            → fichiers markdown ideas
{userId}/content/campagnes/        → fichiers markdown campagnes
{userId}/content/strategy/vision.md
{userId}/content/strategy/generation-log.md
{userId}/content/calendar.md
{userId}/config/identity.md        → identité éditoriale par user (≈ CLAUDE.md)
```

### Couche d'abstraction `lib/storage.ts`

Remplace les appels `fs` actuels. Interface identique, driver Blob :

```typescript
// Lecture
storage.get(userId, 'content/ideas/foo.md') → string | null

// Écriture
storage.put(userId, 'content/ideas/foo.md', content) → void

// Liste
storage.list(userId, 'content/ideas/') → string[]  // paths

// Suppression
storage.delete(userId, 'content/ideas/foo.md') → void
```

Tous les `lib/parse-ideas.ts`, `lib/parse-campaigns.ts`, `lib/vision.ts` etc. reçoivent `userId` en paramètre et passent par `storage` au lieu de `fs`.

**Convention userId :** extrait une seule fois à la frontière route/action via `auth()` de `@clerk/nextjs`, puis passé explicitement en paramètre à toutes les fonctions lib. `storage.ts` n'appelle jamais `auth()` en interne — il reçoit toujours `userId` de l'appelant.

### Migration des données existantes

Script one-shot `scripts/migrate-to-blob.ts` :
1. Lit récursivement `content/` en local
2. Upload chaque fichier dans `{ADMIN_USER_ID}/content/` sur Blob
3. Log les fichiers migrés + erreurs

Flags :
- `--dry-run` : affiche ce qui serait uploadé sans écrire dans Blob (à utiliser en premier)
- `--force` : écrase les fichiers existants si déjà migrés

Rollback : supprimer les blobs via `vercel blob rm {ADMIN_USER_ID}/**` si la migration est incorrecte.

Exécuté une fois manuellement (`npx tsx scripts/migrate-to-blob.ts --dry-run` puis sans flag) avant le premier déploiement.

---

## 3. Limites de dépense (Vercel KV)

### Structure des clés

```
usage:{userId}:{YYYY-MM}  →  JSON { tokensUsed: number, requestCount: number }
limits:{userId}           →  JSON { monthlyTokenLimit: number }
```

### Flux par appel Anthropic

```
1. Lire usage:{userId}:{mois courant}
2. Si pas de limits:{userId} → utiliser DEFAULT_MONTHLY_TOKEN_LIMIT (50 000) sans écrire dans KV
3. Si tokensUsed >= monthlyTokenLimit → HTTP 429 "Budget épuisé ce mois-ci"
4. Exécuter l'appel Anthropic
5. Dans un bloc try/finally :
   - Si succès : enregistrer response.usage.input_tokens + response.usage.output_tokens
   - Si erreur Anthropic : ne pas comptabiliser (l'appel n'a pas consommé de tokens)
6. Incrémenter usage:{userId}:{mois} dans KV
```

**Comportement sur appel échoué :** si l'API Anthropic retourne une erreur (timeout, rate limit, etc.), les tokens ne sont pas comptabilisés — le check ne bloque pas le retry.

### Valeurs par défaut

- Constante `DEFAULT_MONTHLY_TOKEN_LIMIT = 50_000` (~30-40 posts générés complets)
- Si aucune entrée `limits:{userId}` dans KV → fallback sur cette constante (pas d'écriture automatique)
- Limite explicite créée dans KV uniquement quand l'admin modifie la valeur depuis `/admin`
- Réinitialisation : automatique (clé par mois, les anciennes conservées pour historique)

### Couche `lib/usage.ts`

```typescript
checkAndIncrementUsage(userId, estimatedTokens?)  // avant appel
recordUsage(userId, inputTokens, outputTokens)     // après appel
getUsageSummary(userId, month?)                    // pour admin
setUserLimit(userId, monthlyTokenLimit)            // admin seulement
```

---

## 4. Admin Panel (`/admin`)

**Accès :** `userId === process.env.ADMIN_USER_ID` uniquement (vérification server-side).

**Important :** la vérification admin est faite **indépendamment** à deux niveaux :
1. Page `/admin` (server component) — redirige si non-admin
2. Chaque route `/api/admin/*` — retourne 403 si userId !== ADMIN_USER_ID, indépendamment de la page

Un utilisateur ordinaire ne peut pas bypasser la protection en appelant les API routes directement.

### Vue principale

Tableau des utilisateurs (données Clerk + données KV) :

| Email | Prénom | Tokens ce mois | Limite mensuelle | Statut | Actions |
|-------|--------|----------------|-----------------|--------|---------|
| alice@… | Alice | 12 450 | 50 000 | Actif | Modifier limite |
| bob@… | Bob | 3 200 | 50 000 | Actif | Modifier limite |

### Fonctionnalités

- **Voir conso** : tokens utilisés mois courant + % de la limite
- **Modifier limite** : champ éditable, sauvegardé dans KV
- **Désactiver un user** : appel Clerk API (`clerkClient.users.banUser(userId)`) + révocation des sessions actives via `clerkClient.sessions.revokeSession()` — empêche la connexion immédiatement sans attendre l'expiration de session
- **Historique usage** : tableau mois par mois par user

### Énumération des users pour l'admin

Le panel admin liste tous les users via `clerkClient.users.getUserList()` (liste Clerk) croisé avec les clés KV `usage:{userId}:{mois}`. Pour ≤10 utilisateurs, un `SCAN`/`KEYS usage:*` sur KV est acceptable. À noter : cette approche ne passera pas à l'échelle au-delà de ~50 users (à remplacer par une clé registre `users:all → [userId,…]` si besoin).

### Hors scope

- Invitations : faites directement depuis le dashboard Clerk
- Facturation / paiement
- Self-service inscription

---

## 5. Identité éditoriale par utilisateur

Chaque user a son propre `{userId}/config/identity.md` — équivalent du `CLAUDE.md` actuel pour Jonathan.

**Initialisation :** à la première connexion d'un user, l'app détecte l'absence de `identity.md` et affiche un onboarding (nom, poste, piliers, voix). Les réponses génèrent l'identity.md via Claude.

**Pour Jonathan :** son `CLAUDE.md` local est copié tel quel dans `{ADMIN_USER_ID}/config/identity.md` par le script de migration.

---

## 6. Changements techniques résumés

| Composant | Avant | Après |
|-----------|-------|-------|
| Auth | Aucune | Clerk middleware |
| Storage | `fs` local | Vercel Blob + `lib/storage.ts` |
| Usage tracking | Aucun | Vercel KV + `lib/usage.ts` |
| API routes | Pas de userId | `auth()` → userId injecté |
| `lib/parse-*.ts` | paths locaux | paths Blob via storage |
| Admin | Aucun | `/admin` protégé |
| Déploiement | Local 3001 | Vercel |

---

## 7. Ce qui ne change PAS

- Le design et les composants React existants (aucune modification des pages actuelles)
- Les appels Anthropic (même modèle, même prompts)
- La logique métier des campagnes, ideas, planning hebdo
- Les types TypeScript (`Idea`, `Campaign`, `WeeklyPlan`…)

**Nouveaux composants UI (hors scope "pas de changement") :**
- Page `/sign-in` et `/sign-up` Clerk (composants Clerk pré-built, peu de code)
- Page `/admin` (tableau users + limites)
- Écran d'onboarding first-login (formulaire identité éditoriale)

---

## Dépendances à ajouter

```bash
npm install @clerk/nextjs @vercel/blob @vercel/kv
```

## Variables d'environnement complètes (Vercel)

```
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
ADMIN_USER_ID=

# Vercel Blob
BLOB_READ_WRITE_TOKEN=

# Vercel KV
KV_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=
KV_REST_API_READ_ONLY_TOKEN=

# Anthropic (inchangé)
ANTHROPIC_API_KEY=
```
