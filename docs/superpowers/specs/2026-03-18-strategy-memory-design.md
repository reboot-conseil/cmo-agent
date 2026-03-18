# CMO Dashboard — Strategy Memory & Foundation

**Date :** 2026-03-18
**Statut :** En attente de review

---

## Objectif

Enrichir la page `/strategie` avec deux nouveaux blocs en tête de page :

1. **Bloc Socle** — Affichage structuré du contenu de `CLAUDE.md` (identité, piliers, audience, convictions, voix). Statique, zéro latence, zéro Claude.

2. **Bloc Vision** — Mémoire stratégique IA-generated. Claude lit CLAUDE.md + generation-log complet + backlog idées + note Jonathan précédente → génère une synthèse stratégique structurée. Jonathan peut ajouter une note/contexte. Le tout est persisté dans `content/strategy/vision.md` et injecté dans chaque futur appel Bloc 1.

Le `StrategyPlanner` existant devient le **Bloc 3**, inchangé fonctionnellement, mais nourri par la vision.

---

## Architecture

### Page `/strategie` — structure finale

```
┌─────────────────────────────────────────┐
│ Bloc 1 — Socle fondamental              │  server-side, statique
│ (parsé depuis CLAUDE.md)                │
├─────────────────────────────────────────┤
│ Bloc 2 — Vision stratégique             │  client component
│ (IA-generated + note Jonathan)          │
├─────────────────────────────────────────┤
│ Bloc 3 — Moteur de génération           │  client component (existant)
│ (StrategyPlanner — inchangé)            │
└─────────────────────────────────────────┘
```

---

## Bloc 1 — Socle fondamental (`StrategyFoundation`)

### Source de données

Lecture de `CLAUDE.md` **côté serveur** dans `page.tsx`. Parsing manuel des sections markdown (pas de bibliothèque externe). Les données sont passées en props au composant client.

### Sections affichées

| Section CLAUDE.md | Titre affiché | Format |
|---|---|---|
| Identité + Mission éditoriale | Identité & Mission | Texte + badge poste |
| Convictions fortes (§2) | Convictions | Liste numérotée |
| Piliers thématiques (§4) | Piliers | Tableau avec fréquence % |
| Audience cible (§5) | Audience | 3 cards (primaire / secondaire / tertiaire) |
| Marqueurs de voix (§2) | Voix & Style | Liste |

### Composant : `StrategyFoundation`

Composant **server** (pas de 'use client') — reçoit les sections parsées en props, les affiche. Aucun état, aucun effet.

### Parsing côté serveur

Dans `page.tsx`, fonction `parseCLAUDEMd(content: string)` qui extrait les sections clés par leur titre H3. Retourne un objet typé `CLAUDEMdSections`.

```ts
type CLAUDEMdSections = {
  identite: string       // contenu brut de la section identité
  convictions: string[]  // les 5 convictions extraites
  piliers: Array<{ num: number; nom: string; angle: string; frequence: string }>
  audience: Array<{ type: string; douleur: string; cherche: string }>
  voix: string           // contenu brut de la section voix
}
```

---

## Bloc 2 — Vision stratégique (`StrategyMemory`)

### Fichier de persistance : `content/strategy/vision.md`

```markdown
---
generatedAt: 2026-03-18
---

## Vision IA

[Contenu généré par Claude — JSON rendu en markdown]

## Note Jonathan

[Texte libre de Jonathan — vide par défaut]
```

### Lib : `dashboard/lib/vision.ts`

```ts
readVision(): Promise<{ visionIA: string; noteJonathan: string; generatedAt: string | null }>
saveNote(note: string): Promise<void>
saveVision(visionIA: string): Promise<void>
```

Fonctions pures de lecture/écriture du fichier `content/strategy/vision.md`.

### Lib : `dashboard/lib/generate-vision.ts`

```ts
generateVision(): Promise<VisionResponse>

type VisionResponse = {
  situationActuelle: string      // où on en est : campagnes réalisées, piliers couverts
  directionRecommandee: string   // cap stratégique pour les prochains mois
  priorites: string[]            // 3-5 thèmes à prioriser
  themesAEviter: string[]        // sujets déjà saturés ou hors timing
  coherence: string              // analyse de cohérence avec le positionnement CLAUDE.md
}
```

**Inputs pour Claude :**
1. `CLAUDE.md` complet (positionnement, voix, piliers)
2. `generation-log.md` **complet** (pas tronqué — pour la vision on veut toute l'histoire)
3. Résumé du backlog idées (tous statuts, slugs + piliers + statut)
4. Note Jonathan précédente (depuis `vision.md`)

**Paramètres :** `claude-sonnet-4-6`, `max_tokens: 4096`, `CMO_SYSTEM_PROMPT`

**Format de réponse :** JSON strict (même pattern que `generate-strategy.ts`).

### Routes API

```
POST /api/strategy/generate-vision   → appelle generateVision(), saveVision(), retourne VisionResponse
POST /api/strategy/save-note         → body: { note: string } → saveNote(), retourne { ok: true }
```

### Composant : `StrategyMemory` (client)

**États :**
```ts
type MemoryState = {
  visionIA: string
  noteJonathan: string
  generatedAt: string | null
  isGenerating: boolean
  isSavingNote: boolean
  error: string | null
  noteChanged: boolean  // pour afficher le bouton "Sauvegarder"
}
```

**Comportement :**
- La vision existante (lue côté serveur dans `page.tsx`) est passée en `initialData` props
- Bouton **"Régénérer la vision"** → appelle `POST /api/strategy/generate-vision` (~10-15 sec, spinner)
- Zone read-only pour la vision IA (rendu markdown simple, pas de bibliothèque)
- Textarea éditable pour la note Jonathan
- Bouton **"Sauvegarder la note"** apparaît si note modifiée → appelle `POST /api/strategy/save-note`

**Rendu markdown simple :** La vision IA est une chaîne de caractères avec des sections (`situationActuelle`, `directionRecommandee`, etc.) formatées en texte lisible. Pas de rendu MDX — juste affichage des champs structurés dans des zones distinctes.

---

## Intégration avec Bloc 1 (génération campagnes)

`dashboard/lib/generate-strategy.ts` est modifié pour lire `vision.md` et injecter son contenu dans le prompt Claude :

```
## Vision stratégique actuelle
[contenu de vision.md — visionIA + noteJonathan]
```

Cela remplace la lecture partielle du log (qui reste, mais la vision enrichit le contexte).

---

## Fichiers

| Action | Chemin | Responsabilité |
|--------|--------|----------------|
| Create | `dashboard/lib/vision.ts` | Lecture/écriture de `content/strategy/vision.md` |
| Create | `dashboard/lib/vision.test.ts` | Tests unitaires (parsing, serialisation) |
| Create | `dashboard/lib/generate-vision.ts` | Appel Claude → `VisionResponse` |
| Create | `dashboard/app/api/strategy/generate-vision/route.ts` | POST — génère + sauvegarde vision |
| Create | `dashboard/app/api/strategy/save-note/route.ts` | POST — sauvegarde note Jonathan |
| Create | `content/strategy/vision.md` | Fichier de persistance initial |
| Create | `dashboard/components/StrategyFoundation.tsx` | Affichage statique CLAUDE.md |
| Create | `dashboard/components/StrategyMemory.tsx` | Vision IA + note Jonathan |
| Modify | `dashboard/app/strategie/page.tsx` | Intégrer les 3 blocs, parser CLAUDE.md |
| Modify | `dashboard/lib/generate-strategy.ts` | Lire vision.md pour enrichir Bloc 1 |

---

## Types à ajouter dans `lib/types.ts`

```ts
export type CLAUDEMdSections = {
  identite: string
  convictions: string[]
  piliers: Array<{ num: number; nom: string; angle: string; frequence: string }>
  audience: Array<{ type: string; douleur: string; cherche: string }>
  voix: string
}

export type VisionResponse = {
  situationActuelle: string
  directionRecommandee: string
  priorites: string[]
  themesAEviter: string[]
  coherence: string
}

export type VisionData = {
  visionIA: VisionResponse | null
  noteJonathan: string
  generatedAt: string | null
}
```

---

## Décisions de design

1. **`StrategyFoundation` est server component** — pas de state, données statiques → rendu immédiat sans hydratation.
2. **Vision complète vs tronquée** — pour la vision, on lit le generation-log complet (pas seulement 5 entrées). La vision est une synthèse stratégique, pas un prompt de génération. Les tokens sont moins contraints (input uniquement, pas besoin de budget output large).
3. **`VisionResponse` est stocké comme JSON dans `vision.md`** — entre les marqueurs de section, pas en frontmatter (trop verbeux). Lecture par `vision.ts` via extraction de section markdown.
4. **Pas de bibliothèque markdown** — le rendu de la vision IA se fait via affichage des champs structurés dans des divs nommées. YAGNI.
5. **Note Jonathan est plaintext** — textarea libre, pas de markdown editor. Simplicité.
6. **`page.tsx` lit les deux fichiers côté serveur** — `CLAUDE.md` pour `StrategyFoundation` et `vision.md` pour `StrategyMemory`. Données passées en props `initialData`. Pas de fetch client au chargement.
