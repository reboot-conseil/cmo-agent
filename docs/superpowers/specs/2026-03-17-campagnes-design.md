# CMO Dashboard — Campagnes & Stratégie Long Terme

**Date :** 2026-03-17
**Statut :** Approuvé par Jonathan BRAUN

---

## Objectif

Ajouter une couche stratégique au CMO Dashboard : la capacité de créer et piloter des **campagnes** (séries thématiques, formats récurrents, plans stratégiques complets) sur 3 à 6 mois. L'agent CMO génère automatiquement le brief, les phases, la liste des épisodes et le contenu complet de chaque idée. L'utilisateur peaufine avec des champs de contexte libres.

---

## Architecture

### Nouvelle page

`dashboard/app/campagnes/page.tsx` — serveur component, même pattern que `app/page.tsx`.

La sidebar existante reçoit une entrée "Campagnes" (icône `◈`).

### Stockage

Chaque campagne = un fichier markdown : `content/campagnes/<slug>.md`

```
/Users/jonathanbraun/cmo-agent/
├── content/
│   ├── campagnes/          ← NOUVEAU
│   │   └── <slug>.md
│   └── ideas/              ← existant (idées individuelles + idées de campagne)
```

Les idées générées par une campagne vivent dans `content/ideas/` comme toutes les autres idées, avec un champ `campagne: <slug>` dans leur frontmatter.

---

## Dépendances existantes

Tous les types (`Format`, `Idea`, `IdeaStatus`, `Jour`, etc.) sont définis dans `/Users/jonathanbraun/cmo-agent/dashboard/lib/types.ts`. Les imports dans les nouveaux fichiers utilisent `@/lib/types`.

Les piliers valides (union string) : `'IA & Transformation' | 'Stratégie & Décision' | 'Business & ROI' | 'Neurosciences & Adoption' | 'Innovation & Prospective' | 'Coulisses & Authenticité'`

---

## Modèle de données

### Campaign file — `content/campagnes/<slug>.md`

```markdown
---
slug: mini-series-ia-dirigeants
titre: Mini-séries IA pour dirigeants
format: Vidéo
duree: 3
objectif: Positionnement expert + notoriété
statut: draft
createdAt: 2026-03-17
episodesSlug:
  - mini-series-ia-ep01-1abc
  - mini-series-ia-ep02-2def
contexte: ""
---

## Brief

[Généré par Claude — description stratégique de la campagne]

## Phases

[Ex : Mois 1-2 : Awareness → Mois 3 : Conversion]
```

### Type `Campaign` (à ajouter dans `lib/types.ts`)

```ts
export type CampaignStatus = 'draft' | 'active' | 'completed'

export type Campaign = {
  slug: string
  titre: string
  format: Format | 'Mix'
  duree: number           // en mois
  objectif: string
  statut: CampaignStatus
  createdAt: string
  brief: string
  phases: string
  episodesSlug: string[]  // slugs des idées dans content/ideas/
  contexte: string        // champ libre pour guider la régénération
}

export type CampaignGenerateRequest = {
  slug: string
  titre: string
  format: Format | 'Mix'
  duree: number
  objectif: string
  contexte?: string
  maxEpisodes?: number    // plafond strict côté serveur, default 12 (au-delà risque de dépasser max_tokens)
}

export type CampaignGenerateResponse = {
  brief: string
  phases: string
  episodes: Array<{
    sujet: string
    pilier: string
    format: Format
    hook: string
    texte: string
    visuelType: string
    visuelDescription: string
    hashtags: string[]
  }>
}
```

### Extension du type `Idea`

Ajout d'un champ optionnel dans `Idea` et dans les frontmatters des idées :

```ts
campagne?: string   // slug de la campagne parente, si applicable
```

---

## Interface — 3 colonnes

### Colonne gauche : `CampaignList` (280px)

- Liste des campagnes sous forme de cards : titre, format badge, barre de progression (N publiées / total), durée restante estimée
- Filtre par statut : Toutes / Draft / Active / Terminée
- Bouton "+ Nouvelle campagne" → mini-formulaire inline : titre (texte libre) + format (select) + durée (select : 1 / 2 / 3 / 6 mois)

### Colonne centre : `CampaignDetail` (flex)

- Header : titre, objectif, format badge, statut
- Brief stratégique (texte, éditable inline)
- Phases (texte, éditable inline)
- Liste des épisodes : numéro, sujet, format, statut de l'idée associée (lien vers le backlog)
- Bouton "Régénérer la stratégie" avec champ contexte optionnel

### Colonne droite : `CampaignGenerator` (360px)

- 4 champs de contexte peaufinables (tous texte libre) :
  - Audience cible
  - Contraintes (ex : "max 1 vidéo/semaine")
  - Ton souhaité
  - Événements / thèmes à éviter
- Ces 4 champs sont **mergés en un seul `contexte` string** (format libre, ex : "Audience : ...\nContraintes : ...") avant d'être persistés dans le fichier campagne et passés à l'API. Le type `Campaign.contexte` et `CampaignGenerateRequest.contexte` reçoivent ce string fusionné.
- Bouton "Générer la stratégie + toutes les idées" → appelle `/api/campagnes/generate`
- **Pas de streaming** — appel POST standard, le client affiche un spinner pendant la génération (YAGNI)
- Une fois générées : bouton "Voir dans le backlog"

---

## API Routes

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/campagnes` | GET | Liste toutes les campagnes |
| `/api/campagnes` | POST | Crée une campagne vide (titre + format + durée) |
| `/api/campagnes/[slug]` | PATCH | Met à jour une campagne (brief, phases, contexte, statut) |
| `/api/campagnes/generate` | POST | Génère brief + phases + N idées via Claude |

**Pas de route DELETE.** Les campagnes sont permanentes par design. Si l'utilisateur veut abandonner une campagne, il change le statut en `completed`. Cela évite les suppressions accidentelles et préserve l'historique des idées générées.

---

## Lib Files

| Fichier | Responsabilité |
|---------|---------------|
| `dashboard/lib/parse-campaigns.ts` | Lecture/écriture des fichiers `content/campagnes/*.md` |
| `dashboard/lib/parse-campaigns.test.ts` | Tests Vitest pour parse-campaigns |
| `dashboard/lib/generate-campaign.ts` | Appel Claude API pour générer une campagne complète |

### Parsing — `gray-matter`

`parse-campaigns.ts` utilise **`gray-matter`** (à installer : `npm install gray-matter`) pour parser le frontmatter. Cela permet de gérer les listes YAML (`episodesSlug`) nativement, sans parser maison. Le corps markdown (brief, phases) est extrait via `matter.content`.

### Signatures `parse-campaigns.ts`

```ts
parseCampaignFile(raw: string): Campaign
serializeCampaign(campaign: Campaign): string       // utilise gray-matter stringify
readCampaign(slug: string): Promise<Campaign>
writeCampaign(campaign: Campaign): Promise<void>
listCampaigns(): Promise<Campaign[]>
```

Les fonctions sont **async** (pattern Next.js App Router). Contrairement à `parse-ideas.ts` qui est synchrone, `parse-campaigns.ts` utilise `fs/promises`.

### Génération Claude — `generate-campaign.ts`

- **Un seul appel** `claude-sonnet-4-6` avec `max_tokens: 8192`
- Le plafond de 12 épisodes par défaut garantit de rester dans la fenêtre de sortie
- L'agent choisit librement le nombre d'épisodes jusqu'au plafond `maxEpisodes`
- Output JSON parsé depuis le texte brut (même pattern que `generate.ts`)

---

## Génération Claude — Comportement

### Prompt système

Identique au prompt CMO existant dans `lib/generate.ts`.

### Input

```
Titre : Mini-séries IA pour dirigeants
Format : Vidéo (60-120 secondes)
Durée : 3 mois
Objectif : Positionnement expert + notoriété
Contexte : Public = dirigeants PME 50-200 personnes, Alsace, secteurs industrie et santé
```

### Output JSON attendu

```json
{
  "brief": "...",
  "phases": "...",
  "episodes": [
    {
      "sujet": "La question que pose TOUJOURS le premier participant en formation IA",
      "pilier": "Coulisses & Authenticité",
      "format": "Vidéo",
      "hook": "...",
      "texte": "...",
      "visuelType": "Script vidéo",
      "visuelDescription": "...",
      "hashtags": ["#IA", "#Leadership", "#PME"]
    }
  ]
}
```

Le nombre d'épisodes est calculé par l'agent en fonction du format et de la durée (ex : 3 mois × 1 vidéo/semaine = 12 épisodes, mais l'agent peut recommander un rythme différent).

### Après génération

- Le brief et les phases sont écrits dans `content/campagnes/<slug>.md`
- Chaque épisode devient une `Idea` complète dans `content/ideas/<episode-slug>.md` avec `campagne: <slug>` dans le frontmatter
- Les slugs des épisodes sont ajoutés à `episodesSlug` dans la campagne
- Le statut de la campagne passe de `draft` à `active`

---

## Décisions de design

1. **Contrat de régénération** — `POST /api/campagnes/generate` avec un `slug` existant :
   - Les idées dont le statut est `published` sont **préservées** (fichier non touché)
   - Les idées en statut `draft` ou `raw` sont **écrasées in situ** : même slug, contenu remplacé
   - S'il y a plus de nouveaux épisodes que d'anciens slots non-publiés, les épisodes supplémentaires sont créés avec de nouveaux slugs
   - Le brief et les phases de la campagne sont toujours régénérés
   - `episodesSlug` dans la campagne est mis à jour pour refléter l'état final
2. **Les idées de campagne sont des idées normales** — elles apparaissent dans le backlog principal, peuvent être glissées dans le calendrier, éditées, etc.
3. **Format 'Mix'** — une campagne peut avoir un format mixte (ex : 4 posts + 2 carrousels + 1 article). L'agent décide du mix dans ce cas.
4. **Pas de suppression** — il n'existe pas de route DELETE. Si une route DELETE était ajoutée à l'avenir, les idées générées resteraient dans le backlog (sans tag campagne) — pas de cascade.
5. **Champ `campagne` dans Idea** — optionnel, rétrocompatible. Les idées existantes sans ce champ fonctionnent normalement.
