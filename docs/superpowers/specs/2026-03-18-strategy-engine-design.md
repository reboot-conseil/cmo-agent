# CMO Dashboard — Moteur Stratégique

**Date :** 2026-03-18
**Statut :** Approuvé par Jonathan BRAUN

---

## Objectif

Ajouter un moteur de génération stratégique proactif au CMO Dashboard. Jonathan arrive sur la page "Stratégie", indique le nombre de semaines à planifier, et l'agent CMO génère automatiquement un plan trimestriel complet (Bloc 1), que Jonathan valide, puis génère tout le contenu (Bloc 2) en une seule action.

---

## Architecture

### Flux en 3 étapes

```
Étape 1 — Paramètres
  → Nombre de semaines (défaut 12) + contexte optionnel

Étape 2 — Validation Bloc 1
  → Plan proposé (N campagnes) avec checkboxes
  → Jonathan sélectionne / déselectionne

Étape 3 — Génération Bloc 2
  → Appels séquentiels côté client
  → Progression affichée en temps réel
  → Backlog alimenté
```

### Nouvelle page

`dashboard/app/strategie/page.tsx` — server component, même pattern que les autres pages.

La sidebar reçoit une entrée "Stratégie" (icône `⊕`).

---

## Dépendances existantes

- Types : `@/lib/types` (`Campaign`, `CampaignGenerateRequest`, `Format`)
- API existante réutilisée : `POST /api/campagnes` + `POST /api/campagnes/generate`
- `slugify` : importé depuis `@/lib/parse-ideas` — **uniquement utilisé côté serveur** dans les routes existantes ; Bloc 2 n'en a pas besoin côté client (le slug est retourné par `POST /api/campagnes`)
- `listIdeas` : importé depuis `@/lib/parse-ideas` (utilisé dans la route Bloc 1 pour scanner le backlog)
- `CLAUDE.md` lu depuis le filesystem : `/Users/jonathanbraun/cmo-agent/CLAUDE.md`

### Contrat `POST /api/campagnes` (déjà existant)

```ts
// Request body
{ titre: string; format: Format | 'Mix'; duree: number }

// Response (201) — Campaign object complet
Campaign
```

Les champs `objectif`, `brief`, `phases`, `contexte` sont vides à la création — ils sont remplis par le `POST /api/campagnes/generate` qui suit immédiatement.

---

## Bloc 1 — Génération du plan stratégique

### Route : `POST /api/strategy/generate-plan`

**Input :**
```ts
type GeneratePlanRequest = {
  semaines: number       // ex : 12
  contexte?: string      // contexte libre optionnel
}
```

**Output :**
```ts
type GeneratePlanResponse = {
  campaigns: ProposedCampaign[]
}

type ProposedCampaign = {
  titre: string
  format: Format | 'Mix'
  duree: number           // en mois
  objectif: string
  pilier: string
  rationale: string       // pourquoi cette campagne maintenant
}
```

### Lib : `dashboard/lib/generate-strategy.ts`

```ts
generateStrategyPlan(req: GeneratePlanRequest): Promise<GeneratePlanResponse>
```

**Prompt Claude — inputs :**
1. Contenu complet de `CLAUDE.md` (positionnement, piliers, audience, voix, convictions)
2. Résumé du log de génération via `readGenerationLog()` (campagnes passées, sujets couverts, piliers utilisés)
3. Résumé des idées existantes via `readIdeasSummary()` — voir ci-dessous
4. Nombre de semaines demandé + contexte optionnel

**`readIdeasSummary()` — dans `generate-strategy.ts` :**
Appelle `listIdeas()` depuis `parse-ideas`, retourne une string concise :
```
Idées existantes (N) :
- "Pourquoi 80% des projets IA échouent" [IA & Transformation]
- "Le POC de 5 jours" [Business & ROI]
...
```
Limitée aux 50 idées les plus récentes pour contrôler la taille du prompt.

**Paramètres Claude :**
- Modèle : `claude-sonnet-4-6`
- `max_tokens: 8192` (CLAUDE.md est long ~2000 tokens, budget output suffisant)
- `SYSTEM_PROMPT` importé depuis `@/lib/prompts` (voir section SYSTEM_PROMPT)

**Comportement attendu :** Claude détermine le nombre optimal de campagnes (typiquement 3-6 pour 12 semaines), équilibre les piliers, évite les sujets déjà couverts dans le log.

---

## Bloc 2 — Génération du contenu

Bloc 2 est **entièrement côté client** — pas de nouvelle route API.

Pour chaque campagne sélectionnée, le client exécute séquentiellement :

1. `POST /api/campagnes` avec `{ titre, format, duree }` → reçoit le `Campaign` créé, **dont le `slug` est généré côté serveur** (la route fait `slugify(titre) + '-' + Date.now().toString(36)` et le retourne dans l'objet `Campaign`)
2. `POST /api/campagnes/generate` avec `{ slug, titre, format, duree, objectif, contexte: '' }` → reçoit le `Campaign` mis à jour (même type `Campaign` que l'étape précédente, **pas** `CampaignGenerateResponse`) avec ses `episodesSlug` remplis
3. `episodesCount = updatedCampaign.episodesSlug.length` (dérivé de la réponse)

Entre chaque campagne, le composant met à jour l'état de progression.

Une fois toutes les campagnes générées, le log est mis à jour via `POST /api/strategy/update-log` avec un `GenerationEntry` construit côté client.

---

## Log de génération

**Fichier :** `content/strategy/generation-log.md`

**Structure :**
```markdown
---
lastGeneration: 2026-03-18
totalPostsGenerated: 0
---

## Générations

### 2026-03-18 — Plan 12 semaines

- Campagnes créées : 4
- Posts générés : 36
- Piliers couverts : IA & Transformation (12), Stratégie & Décision (8), Business & ROI (8), Coulisses & Authenticité (8)
- Sujets principaux : POC IA, Résistance au changement, ROI formation IA, Coulisses Reboot
```

**Lib : `dashboard/lib/generation-log.ts`**

```ts
readGenerationLog(): Promise<string>           // retourne les N dernières entrées (max 5) pour le prompt — troncature pour contrôler la taille
appendGenerationEntry(entry: GenerationEntry): Promise<void>
```

```ts
type GenerationEntry = {
  date: string
  semaines: number
  campaigns: Array<{ titre: string; pilier: string; episodesCount: number }>
}
```

### Route : `POST /api/strategy/update-log`

Appelée par le client après la fin du Bloc 2. Body : `GenerationEntry`.

---

## Interface — Page Stratégie

### Composant principal : `StrategyPlanner` (client)

État géré par `useState` directement dans `StrategyPlanner` — pas de Context (YAGNI : une seule page, pas de sous-composants profonds qui ont besoin de partager l'état).

```ts
type StrategyState = {
  step: 'params' | 'review' | 'generating' | 'done'
  semaines: number
  contexte: string
  proposedCampaigns: ProposedCampaign[]
  selectedIndices: Set<number>
  progress: { current: number; total: number; currentTitle: string }
  error: string | null
}
```

### Étape 1 — Paramètres

- Input numérique "Nombre de semaines" (1-24, défaut 12)
- Textarea "Contexte optionnel" (focus, contraintes, événements à venir)
- Bouton "Générer le plan stratégique" → appelle Bloc 1

### Étape 2 — Validation

- Titre de section : "Plan proposé pour X semaines (N campagnes)"
- Cards de campagnes :
  - Checkbox de sélection
  - Titre + format badge + durée + pilier
  - Rationale (texte Claude expliquant le choix)
- Bouton "Tout sélectionner / Tout déselectionner"
- Bouton "Générer N campagnes sélectionnées" (disabled si 0 sélection)

### Étape 3 — Progression

- Barre de progression animée
- Texte : "Campagne 2/4 — Mini-séries IA pour dirigeants..."
- Pas d'annulation possible (YAGNI)
- Une fois terminé : résumé (N campagnes créées, N épisodes générés) + lien "Voir dans le backlog"

---

## Fichiers

| Action | Chemin | Responsabilité |
|--------|--------|---------------|
| Create | `dashboard/lib/prompts.ts` | SYSTEM_PROMPT partagé (extrait de generate.ts + generate-campaign.ts) |
| Create | `dashboard/lib/generate-strategy.ts` | Appel Claude Bloc 1 + readIdeasSummary() |
| Create | `dashboard/lib/generation-log.ts` | Lecture/écriture du log |
| Create | `dashboard/app/api/strategy/generate-plan/route.ts` | Bloc 1 API |
| Create | `dashboard/app/api/strategy/update-log/route.ts` | Mise à jour log |
| Create | `dashboard/components/StrategyPlanner.tsx` | Composant principal (useState, pas de Context) |
| Create | `dashboard/app/strategie/page.tsx` | Page serveur |
| Modify | `dashboard/components/Sidebar.tsx` | Ajouter "Stratégie" |
| Modify | `dashboard/lib/generate.ts` | Importer SYSTEM_PROMPT depuis prompts.ts |
| Modify | `dashboard/lib/generate-campaign.ts` | Importer SYSTEM_PROMPT depuis prompts.ts |

---

## Types à ajouter dans `lib/types.ts`

```ts
export type ProposedCampaign = {
  titre: string
  format: Format | 'Mix'
  duree: number
  objectif: string
  pilier: string
  rationale: string
}

export type GeneratePlanRequest = {
  semaines: number
  contexte?: string
}

export type GeneratePlanResponse = {
  campaigns: ProposedCampaign[]
}

export type GenerationEntry = {
  date: string
  semaines: number
  campaigns: Array<{ titre: string; pilier: string; episodesCount: number }>
}
```

---

## Décisions de design

1. **Bloc 2 côté client** — les appels séquentiels à `/api/campagnes/generate` se font depuis le navigateur. Cela permet d'afficher la progression naturellement sans streaming côté serveur.
2. **Pas de streaming Bloc 1** — appel standard, spinner pendant la génération du plan (~5-10 sec). YAGNI.
3. **Log en markdown** — cohérent avec le reste du projet (ideas, campagnes). Facile à lire pour Claude dans le prompt.
4. **CLAUDE.md comme source de vérité** — le profil stratégique est lu directement depuis le filesystem, pas dupliqué. L'onglet "modifier le profil" sera ajouté dans une future itération.
5. **Pas d'annulation Bloc 2** — les campagnes créées restent dans le backlog même si l'utilisateur ferme l'onglet. La génération est idempotente dans le sens où une nouvelle campagne crée toujours un nouveau slug.
6. **SYSTEM_PROMPT centralisé** — extrait dans `lib/prompts.ts` et importé par `generate.ts`, `generate-campaign.ts` et `generate-strategy.ts`. Élimine la duplication existante.
7. **Pas de StrategyContext** — `useState` dans `StrategyPlanner` suffit pour un flow linéaire en 3 étapes sur une seule page.

---

## SYSTEM_PROMPT partagé — `dashboard/lib/prompts.ts`

```ts
export const CMO_SYSTEM_PROMPT = `Tu es l'agent CMO de Jonathan BRAUN, Responsable Stratégie & Intelligence Artificielle chez Reboot Conseil.

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
```
