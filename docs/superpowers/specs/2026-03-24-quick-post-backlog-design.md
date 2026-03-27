# Design — Publication one-shot → Backlog

**Date :** 2026-03-24
**Contexte :** Ajout d'un panneau "Quick Post" dans la page "Cette semaine" pour capturer rapidement une idée de publication sur un sujet spécifique et l'envoyer dans le backlog.

---

## Problème

Le flux actuel de "Cette semaine" génère 3-4 posts planifiés à partir de campagnes actives + note vocale + veille. Il n'existe pas de moyen rapide de capturer une idée de publication one-shot indépendante et de l'envoyer dans le backlog sans passer par une planification complète.

---

## Solution

Un troisième panneau `QuickPostPanel` dans la colonne gauche de la page "Cette semaine" (sous `NoteVocalePanel` et `VeillePanel`). Jonathan saisit uniquement un sujet ; Claude infère le pilier et le format, génère un hook, et crée l'idée en statut `draft` dans le backlog.

---

## Architecture — 3 fichiers

### 1. `dashboard/components/QuickPostPanel.tsx`

**Props :** aucune (composant entièrement autonome, pas d'état partagé avec la page parente)

**État local :**
- `sujet: string` — valeur du champ texte
- `loading: boolean` — pendant l'appel API
- `success: boolean` — confirmation courte après ajout (reset après 3s)

**UI :**
- Label "Idée one-shot"
- `<textarea>` : "Sujet de la publication"
- Bouton "Générer → Backlog" (disabled si sujet vide ou loading)
- Message de confirmation : "Ajouté au backlog" (vert, disparaît après 3s)
- Le champ texte est **vidé** après une soumission réussie

---

### 2. `dashboard/lib/generate-quick-post.ts`

Même pattern que `generate-veille.ts` : client Anthropic, prompt, parser typé.

**Prompt :** Fournit à Claude le sujet + la liste exhaustive des 6 piliers valides + la liste des formats valides (`Post`, `Carrousel`, `Article`, `Vidéo`, `Newsletter`). Demande un JSON structuré.

**Forme JSON retournée par Claude :**
```ts
{
  pilier: string,   // l'un des 6 piliers éditoriaux
  format: Format,   // 'Post' par défaut, 'Carrousel' si le sujet s'y prête
  hook: string      // 1-2 lignes d'accroche
}
```

**Parser `parseQuickPostResponse(raw: string)`** : parse le JSON, valide que `pilier` et `format` sont des valeurs connues. En cas d'échec de parsing, fallback sur `{ pilier: 'IA & Transformation', format: 'Post', hook: '' }` — l'idée est quand même créée, avec hook vide.

**`visuelType` selon le format :**
- `Post` → `'Photo authentique'`
- `Carrousel` → `'Slides carrousel'`
- `Article` / `Newsletter` → `'Photo authentique'`
- `Vidéo` → `'Script vidéo'`

Note : `visuelType` est une `string` libre (voir `lib/types.ts`). `IdeaCard` et `DetailPanel` l'affichent en texte brut sans condition — aucune valeur ne casse le rendu.

---

### 3. `dashboard/app/api/cette-semaine/quick-post/route.ts`

**Request body :** `{ sujet: string }`

**Validation :** retourne `400` si `sujet` est absent ou vide.

**Traitement :**
1. Appelle `generateQuickPost(sujet)` de `lib/generate-quick-post.ts`
2. Construit l'idée avec `writeIdea()` de `@/lib/parse-ideas`
3. Retourne `{ idea: Idea }`

**Slug :** `slugify(sujet) + '-' + Date.now().toString(36)` — même pattern que `validate/route.ts`. Collision négligeable en contexte mono-utilisateur.

**Idée créée :**
```ts
{
  slug,
  sujet,
  pilier,               // inféré par Claude
  format,               // inféré par Claude
  hook,                 // généré par Claude
  texte: '',            // vide — à développer depuis le Calendrier
  statut: 'draft',
  semaine: null,
  jour: null,
  createdAt: today,      // new Date().toISOString().split('T')[0] — même pattern que validate/route.ts
  visuelType,           // déduit du format (voir règle ci-dessus)
  visuelDescription: '',
  hashtags: [],
}
```

**En cas d'erreur Claude :** le fallback du parser crée quand même l'idée avec `hook: ''`. L'API retourne `200` avec l'idée créée. Pas de 500 sauf erreur réseau.

**Response :** `{ idea: Idea }`

---

### Intégration dans `page.tsx`

Ajout de `<QuickPostPanel />` dans la colonne gauche, après `<VeillePanel />`. Aucun prop ni état partagé.

---

## Types

Aucun nouveau type. Réutilise `Idea` et `Format` existants dans `lib/types.ts`.

---

## Ce qui est hors scope

- Génération du texte complet (fait depuis le Calendrier via `/api/generate`)
- Champ pilier ou format manuels (Claude infère)
- Planification immédiate (semaine/jour)
- Prévisualisation du hook avant envoi

---

## Flux utilisateur

```
Jonathan saisit un sujet
       ↓
Clic "Générer → Backlog"
       ↓
POST /api/cette-semaine/quick-post
       ↓
generateQuickPost() → Claude infère pilier + format + génère hook
       ↓
writeIdea() → content/ideas/*.md (statut: draft)
       ↓
Champ vidé + "Ajouté au backlog" (feedback 3s)
       ↓
Idée visible dans Calendrier → Backlog
```
