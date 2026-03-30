# Admin — Usage par utilisateur — Design Spec

**Date:** 2026-03-30
**Statut:** Approuvé

---

## Contexte

La page `/admin` affiche l'usage API de l'admin uniquement. On veut y ajouter un tableau listant tous les utilisateurs avec leur consommation du mois en cours.

---

## Périmètre

**Dans le scope :**
- Lister tous les userIds ayant des données d'usage dans Vercel Blob
- Afficher dans AdminPanel : userId (tronqué), tokens utilisés, requêtes, % de limite

**Hors scope :**
- Résoudre les userIds en emails/noms (choix B — userId brut)
- Modifier les limites par utilisateur depuis ce tableau
- Pagination (acceptable pour ≤50 utilisateurs)

---

## Architecture

### Données

Les blobs d'usage suivent le pattern : `{userId}/usage/{YYYY-MM}.json`

Pour lister tous les utilisateurs : appeler Vercel Blob `list()` avec suffix `/usage/{YYYY-MM}.json`, extraire les userIds depuis les pathnames.

### Nouveaux fichiers

Aucun.

### Fichiers modifiés

**`dashboard/lib/usage.ts`**
Ajouter la fonction :
```ts
export async function listAllUsersUsage(month?: string): Promise<{
  userId: string
  tokensUsed: number
  requestCount: number
  limit: number
}[]>
```
Utilise `list({ prefix: '' })` (ou sans prefix) depuis `@vercel/blob`, filtre les blobs dont le pathname matche `*/usage/{month}.json`, extrait le userId (premier segment du path), récupère usage + limite pour chaque.

**`dashboard/app/admin/page.tsx`**
Appeler `listAllUsersUsage(currentMonth)` et passer le résultat à `<AdminPanel>` via une nouvelle prop `allUsersUsage`.

**`dashboard/components/AdminPanel.tsx`**
Ajouter une section "Utilisateurs — mois courant" sous l'historique existant :
- Tableau : userId (10 premiers chars + `…`) · tokens · requêtes · % limite
- Trié par tokens décroissant
- Le bloc existant (historique 6 mois admin) reste intact

---

## Résultat attendu

La page `/admin` affiche en bas :
- Un tableau de tous les utilisateurs ayant utilisé l'app ce mois
- Pour chacun : userId tronqué, tokens consommés, nb requêtes, pourcentage de leur limite
- Trié du plus consommateur au moins consommateur
