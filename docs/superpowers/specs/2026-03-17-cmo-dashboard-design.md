# CMO Dashboard — Design Spec

**Date :** 2026-03-17
**Statut :** Approuvé par Jonathan BRAUN

---

## Objectif

Un dashboard Next.js dans `/Users/jonathanbraun/cmo-agent/dashboard/` qui remplace `cmo-dashboard/`. Interface 3 colonnes : backlog d'idées enrichies → calendrier éditorial → panneau détail. L'agent CMO (Claude API) génère automatiquement texte complet + description visuelle depuis l'idée brute.

---

## Architecture

### Emplacement

```
/Users/jonathanbraun/cmo-agent/
├── dashboard/              ← NEW: Next.js 15 app (port 3001)
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── package.json
├── content/
│   ├── ideas/              ← NEW: un .md par idée enrichie
│   │   └── <slug>.md
│   ├── ideas-backlog.md    ← existant (idées brutes)
│   └── calendar.md         ← existant
├── intelligence/
│   └── performance-log.md
└── CLAUDE.md
```

### Stack

- Next.js 15, React 19, TypeScript, Tailwind v4 (tokens de dashboard-chef-projet)
- Recharts 3, Claude API `claude-sonnet-4-6`, Vitest

---

## Modèle de données

### Idea file — `content/ideas/<slug>.md`

Frontmatter YAML + sections markdown :

```
---
id: projets-ia-echouent
sujet: Pourquoi 80% des projets IA échouent avant même le premier POC
pilier: IA & Transformation
format: Post
statut: draft
semaine: null
jour: null
createdAt: 2026-03-17
---

## Hook
« Ce n'est presque jamais un problème de technologie. »

## Texte
[corps complet généré par l'agent]

## Visuel
**Type :** Photo authentique
Description détaillée de la photo/vidéo/carousel à produire.

## Hashtags
#IntelligenceArtificielle #TransformationDigitale #StratégieIA
```

### Types TypeScript

```ts
type IdeaStatus = 'raw' | 'draft' | 'ready' | 'scheduled' | 'published'
type Format = 'Post' | 'Carrousel' | 'Article' | 'Vidéo' | 'Newsletter'

type Idea = {
  id: string; slug: string; sujet: string; pilier: string
  format: Format; statut: IdeaStatus
  semaine: number | null; jour: 'Mar' | 'Mer' | 'Jeu' | null
  createdAt: string; hook: string; texte: string
  visuel: string; hashtags: string[]
}
```

---

## Interface — 3 colonnes

### Col 1 — Backlog (340px)
- Onglets filtres : Tous / Post / Carrousel / Article / Vidéo
- Carte par idée : sujet (bold), aperçu texte 2 lignes, badge format, indicateur visuel, handle drag
- Pastille statut : raw=gris, draft=bleu, ready=vert
- Clic → détail ; drag → dépose sur créneau

### Col 2 — Calendrier (flex)
- Nav mois, KPIs (planifiés / à valider / publiés)
- Grille Mar/Mer/Jeu × Semaines
- Créneau vide : pointillé + "Déposer" ; rempli : barre couleur pilier + sujet + badge statut
- Drop zone highlight bleu au survol
- Clic créneau rempli → ouvre détail

### Col 3 — Détail (380px)
- Badge pilier + format, sujet, hook en italique
- Section Texte : corps complet, éditable inline
- Section Visuel : type + description complète
- Section Hashtags : pills
- Section Planifier : grille créneaux disponibles (clic = assigne)
- Actions : `Planifier` (primary) · `Modifier` (secondary) · `Régénérer` (tertiary)

---

## Génération de contenu — Claude API

### Déclenchement
Bouton "Générer" sur une idée `raw`, ou lors de la création d'une idée brute.

### Route `POST /api/generate`
- Input : sujet, pilier, format + voix/convictions de CLAUDE.md injectées en system prompt
- Model : `claude-sonnet-4-6`
- Output JSON : `{ hook, texte, visuel, hashtags }`
- Écrit dans `content/ideas/<slug>.md`, statut passe `raw` → `draft`

---

## Flux utilisateur

1. **Capture** : ajoute idée brute → fichier `raw`
2. **Génération** : clic "Générer" → Claude produit → statut `draft`
3. **Review** : lit + modifie → statut `ready`
4. **Planification** : drag-drop ou clic créneau → `scheduled`
5. **Publication** : publie LinkedIn, marque `published`

---

## API Routes

| Route | Méthode | Rôle |
|-------|---------|------|
| `/api/ideas` | GET | Lit tous `content/ideas/*.md` |
| `/api/ideas` | POST | Crée idée brute |
| `/api/ideas/[slug]` | PATCH | Update statut / texte / planning |
| `/api/generate` | POST | Appelle Claude API, écrit résultat |
| `/api/calendar` | GET | Lit `content/calendar.md` |
| `/api/performance` | GET/POST | Lit/écrit `performance-log.md` |

---

## Design tokens

Repris intégralement de `dashboard-chef-projet/app/globals.css` :
`--color-primary: #2563EB` · `--color-background: #F8FAFC` · `--color-surface: #ffffff` · `--color-border: #E2E8F0` + radius, shadows, typographie.

---

## Hors scope v1

Auth, LinkedIn API sync, dark mode, mobile, historique versions, collaboration temps réel.

---

## Décisions de conception (2026-03-17)

### 1. Conflit de créneau
Swap automatique : si une idée est glissée sur un créneau occupé, l'idée déjà planifiée reprend le statut `ready` (déplanifiée) et la nouvelle prend sa place.

### 2. Transitions de statut
Flexibles — on peut sauter des étapes. Ex : une idée peut passer directement de `raw` à `scheduled`.

### 3. Sync calendar.md
**Les fichiers idea sont la source de vérité pour le planning** (`semaine` + `jour` dans le frontmatter). `calendar.md` est regénéré automatiquement à chaque changement de planning (écriture UI → idea file → regénération calendar.md). Plus de conflits de sync, calendar.md reste toujours lisible.

### 4. Régénérer
Disponible sur toutes les idées (raw, draft, ready). Une zone de texte "Direction / contexte" optionnelle permet de guider la régénération (ex : "angle plus personnel", "insister sur le ROI", "public dirigeants PME").
