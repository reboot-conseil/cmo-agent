# CMO Dashboard — Strategy Memory & Foundation

**Date :** 2026-03-18
**Statut :** Approuvé

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

Lecture de `CLAUDE.md` **côté serveur** dans `page.tsx`. Parsing manuel des sections markdown (pas de bibliothèque externe). Les données sont passées en props au composant server `StrategyFoundation`.

### Sections affichées

| Section CLAUDE.md | Titre affiché | Format |
|---|---|---|
| `## 1. IDENTITÉ` (jusqu'à `### Mission éditoriale` inclus) | Identité & Mission | Texte + badge poste |
| `### Convictions fortes` (dans §2) | Convictions | Liste numérotée |
| `## 4. PILIERS THÉMATIQUES` (table markdown) | Piliers | Tableau avec fréquence % |
| `## 5. AUDIENCE CIBLE` (3 sous-sections) | Audience | 3 cards |
| `### Marqueurs de voix à utiliser` (dans §2) | Voix & Style | Liste bullet |

### Parsing côté serveur — règles exactes

La structure réelle de `CLAUDE.md` utilise des H2 (`##`) pour les sections principales et des H3 (`###`) pour les sous-sections. Le parsing ne peut pas être un simple split sur H3 — il doit cibler les bons niveaux par section.

Fonction `parseCLAUDEMd(content: string): CLAUDEMdSections` dans `page.tsx` :

**`identite`** — Extraire le contenu entre `## 1. IDENTITÉ` et le premier H3 `### Parcours` : prend `### Mission éditoriale` et `### Ce qui rend Jonathan unique`. Concaténer ces deux sous-sections en string brut.

**`convictions`** — Chercher `### Convictions fortes` (dans §2), extraire le bloc jusqu'au prochain H3. Parser chaque ligne commençant par un chiffre suivi d'un `.` → `string[]`. Supprimer le marquage gras markdown (`**...**`) avec `.replace(/\*\*/g, '')`.

**`piliers`** — Extraire la section `## 4. PILIERS THÉMATIQUES` jusqu'au prochain `##`. Parser le tableau markdown : chaque ligne `| # | **Nom** | Angle | X% |` → `{ num, nom, angle, frequence }`. Nettoyer le gras avec `.replace(/\*\*/g, '')`.

**`audience`** — Extraire `## 5. AUDIENCE CIBLE` jusqu'au prochain `##`. Parser les 3 sous-sections H3 (`### Cible primaire`, `### Cible secondaire`, `### Cible tertiaire`). Pour chaque, extraire les lignes `**Douleur principale :**` et `**Ce qu'ils cherchent :**` → `{ type: 'primaire'|'secondaire'|'tertiaire', douleur, cherche }`.

**`voix`** — Extraire uniquement `### Marqueurs de voix à utiliser` (dans §2), jusqu'au prochain H3. Retourner string brut. **Ne pas inclure** `### Convictions fortes` ni `### Tonalité` (traités séparément ou ignorés).

### Composant : `StrategyFoundation`

Composant **server** (pas de `'use client'`) — reçoit `CLAUDEMdSections` en props, les affiche. Aucun état, aucun effet.

---

## Bloc 2 — Vision stratégique (`StrategyMemory`)

### Fichier de persistance : `content/strategy/vision.md`

```markdown
---
generatedAt: 2026-03-18
---

## Vision IA

```json
{
  "situationActuelle": "...",
  "directionRecommandee": "...",
  "priorites": ["...", "..."],
  "themesAEviter": ["...", "..."],
  "coherence": "..."
}
```

## Note Jonathan

[Texte libre de Jonathan — vide par défaut]
```

Le JSON est stocké **dans un bloc de code fencé** (` ```json ... ``` `) dans la section `## Vision IA`. Cela le rend machine-parseable par extraction de section + JSON.parse, tout en restant lisible à l'œil.

### Lib : `dashboard/lib/vision.ts`

```ts
readVision(): Promise<VisionData>
// Lit vision.md. Si le fichier n'existe pas → retourne { visionIA: null, noteJonathan: '', generatedAt: null }
// Extrait la section ## Vision IA, parse le bloc ```json``` → VisionResponse | null
// Extrait la section ## Note Jonathan → string brut
// Retourne VisionData

saveVision(vision: VisionResponse, generatedAt: string): Promise<void>
// Écrit/réécrit vision.md complet (frontmatter + Vision IA JSON fencé + Note Jonathan préservée)
// fs.mkdirSync(path.dirname(VISION_PATH), { recursive: true }) avant l'écriture

saveNote(note: string): Promise<void>
// Met à jour uniquement la section ## Note Jonathan, préserve Vision IA et frontmatter
// fs.mkdirSync(...) avant l'écriture
```

`VisionData` est défini dans `types.ts` (voir section Types). `readVision()` retourne `VisionResponse | null` pour `visionIA` — **pas `string`**.

**Helpers purs exportés pour les tests :**
```ts
extractJsonFromVisionSection(content: string): VisionResponse | null
extractNoteSection(content: string): string
serializeVisionFile(vision: VisionResponse, note: string, generatedAt: string): string
```

### Lib : `dashboard/lib/generate-vision.ts`

```ts
generateVision(): Promise<VisionResponse>
```

**Inputs pour Claude :**
1. `CLAUDE.md` complet (lu via `fs.readFileSync`)
2. Log complet via `readFullGenerationLog()` — **pas tronqué** (voir modification `generation-log.ts`)
3. Résumé idées enrichi via `readIdeasSummaryFull()` — sujet + pilier + **statut** pour chaque idée, top 100 (voir modification `generate-strategy.ts`)
4. Note Jonathan précédente via `readVision().noteJonathan` — string, peut être vide

**Paramètres :** `claude-sonnet-4-6`, `max_tokens: 4096`, `CMO_SYSTEM_PROMPT`

**Format réponse :** JSON strict. Le prompt demande ce JSON exact :
```json
{
  "situationActuelle": "résumé de l'état actuel en 2-3 phrases",
  "directionRecommandee": "cap stratégique pour les 3 prochains mois en 2-3 phrases",
  "priorites": ["thème 1", "thème 2", "thème 3"],
  "themesAEviter": ["sujet saturé 1", "sujet saturé 2"],
  "coherence": "analyse de cohérence avec CLAUDE.md en 2 phrases"
}
```

### Routes API

```
POST /api/strategy/generate-vision
  → appelle generateVision()
  → appelle saveVision(result, today)
  → retourne VisionData complet (visionIA, noteJonathan, generatedAt)

POST /api/strategy/save-note
  → body: { note: string }
  → appelle saveNote(body.note)
  → retourne { ok: true }
```

### Composant : `StrategyMemory` (client)

**Props :**
```ts
type StrategyMemoryProps = {
  initialData: VisionData  // passé depuis page.tsx (peut avoir visionIA: null si premier lancement)
}
```

**État interne :**
```ts
type MemoryState = {
  vision: VisionData
  isGenerating: boolean
  isSavingNote: boolean
  error: string | null
  noteChanged: boolean
  noteValue: string
}
```

**Comportement :**
- Initialisation depuis `initialData` (aucun fetch au chargement)
- Si `vision.visionIA === null` : afficher état vide avec message "Aucune vision générée — cliquez sur Générer"
- Bouton **"Générer la vision"** (ou "Régénérer") → `POST /api/strategy/generate-vision` (~15 sec, spinner)
- Affichage `VisionResponse` en champs structurés distincts (pas de rendu markdown)
- Textarea pour `noteJonathan` — bouton **"Sauvegarder"** visible si note modifiée
- Sur sauvegarde : `POST /api/strategy/save-note`

**Affichage `VisionResponse`** (champs → zones nommées) :
- `situationActuelle` → card "Situation actuelle"
- `directionRecommandee` → card "Direction recommandée"
- `priorites` → liste "Priorités"
- `themesAEviter` → liste "À éviter"
- `coherence` → card "Cohérence positionnement"

---

## Modifications `generation-log.ts`

Ajouter l'export :
```ts
export async function readFullGenerationLog(): Promise<string>
// Comme readGenerationLog() mais sans troncature — retourne toutes les entrées
// Si vide → retourne 'Aucune génération précédente.'
```

---

## Modifications `generate-strategy.ts`

**1. Nouvelle fonction `readIdeasSummaryFull()`** (remplace `readIdeasSummary()` pour la vision) :
```ts
async function readIdeasSummaryFull(): Promise<string>
// Appelle listIdeas(), top 100, inclut sujet + pilier + statut
// Format : - "Titre" [Pilier] (statut)
```

**2. Injecter la vision dans le prompt Bloc 1** :
Ajouter après le bloc "Idées existantes" dans le userPrompt de `generateStrategyPlan()` :
```
## Vision stratégique actuelle
[lecture de readVision() → situationActuelle + directionRecommandee + noteJonathan si non vide]
```
Utiliser `readVision()` depuis `vision.ts`. Si `visionIA` est null, omettre le bloc.

---

## Intégration `page.tsx`

```tsx
export default async function StrategiePage() {
  const claudeMd = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8')
  const sections = parseCLAUDEMd(claudeMd)
  const visionData = await readVision()  // null-safe : retourne VisionData avec visionIA: null si absent

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
        <StrategyFoundation sections={sections} />
        <StrategyMemory initialData={visionData} />
        <StrategyPlanner />
      </div>
    </div>
  )
}
```

Note : le layout change — le scroll se fait sur le conteneur droit (plus `overflow: hidden` sur le wrapper intérieur).

---

## Fichiers

| Action | Chemin | Responsabilité |
|--------|--------|----------------|
| Modify | `dashboard/lib/types.ts` | Ajouter `CLAUDEMdSections`, `VisionResponse`, `VisionData` |
| Create | `dashboard/lib/vision.ts` | Lecture/écriture `vision.md` + helpers purs |
| Create | `dashboard/lib/vision.test.ts` | Tests unitaires helpers purs |
| Create | `dashboard/lib/generate-vision.ts` | Appel Claude → `VisionResponse` |
| Create | `dashboard/app/api/strategy/generate-vision/route.ts` | POST — génère + sauvegarde vision |
| Create | `dashboard/app/api/strategy/save-note/route.ts` | POST — sauvegarde note |
| Create | `content/strategy/vision.md` | Fichier de persistance initial (vide) |
| Create | `dashboard/components/StrategyFoundation.tsx` | Affichage statique sections CLAUDE.md |
| Create | `dashboard/components/StrategyMemory.tsx` | Vision IA + note Jonathan |
| Modify | `dashboard/app/strategie/page.tsx` | Parser CLAUDE.md, lire vision, intégrer 3 blocs |
| Modify | `dashboard/lib/generation-log.ts` | Ajouter `readFullGenerationLog()` |
| Modify | `dashboard/lib/generate-strategy.ts` | Ajouter `readIdeasSummaryFull()`, injecter vision dans prompt |

---

## Types à ajouter dans `lib/types.ts`

```ts
// ─── Strategy Memory ──────────────────────────────────────────────────────────

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
2. **Vision complète vs tronquée** — pour la vision, on lit le generation-log complet. `readFullGenerationLog()` est une nouvelle export de `generation-log.ts`.
3. **`VisionResponse` stocké comme JSON fencé** dans `vision.md` (bloc ` ```json ``` `). Machine-parseable et lisible. `vision.ts` extrait le bloc, fait `JSON.parse`, retourne `VisionResponse | null`.
4. **`readVision()` retourne `VisionResponse | null`** (pas `string`) — cohérent avec `VisionData.visionIA`. Le composant `StrategyMemory` affiche les champs directement depuis l'objet.
5. **Pas de bibliothèque markdown** — affichage des champs `VisionResponse` dans des zones nommées. YAGNI.
6. **Note Jonathan est plaintext** — textarea libre.
7. **`page.tsx` lit les deux fichiers côté serveur** — `vision.md` absent → `readVision()` retourne `{ visionIA: null, noteJonathan: '', generatedAt: null }` sans planter.
8. **`mkdirSync` dans `vision.ts`** — avant chaque écriture, comme dans `generation-log.ts` ligne 63.
9. **Parsing CLAUDE.md par section H2** — le parser cible les sections H2 (`##`) pour piliers et audience, et les sous-sections H3 (`###`) nommées précisément pour convictions et voix. Pas de split générique sur H3.
