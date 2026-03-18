# 🧠 Agent CMO — Jonathan BRAUN × LinkedIn

Agent de personal branding piloté par Claude Code.
Mode semi-automatisé : l'agent prépare, tu valides et publies.

---

## Démarrage rapide

```bash
cd cmo-agent
claude
```

Claude Code lit automatiquement le fichier `CLAUDE.md` et connaît tout le contexte.

## Commandes naturelles

Tape simplement dans Claude Code :

| Commande | Ce que ça fait |
|----------|---------------|
| `Génère un post sur [sujet]` | Produit 2-3 variantes avec hooks différents |
| `Prépare ma semaine de contenu` | Plan de 3-5 posts avec piliers et hooks |
| `Génère le pack hebdo` | Produit un pack complet formaté (3 posts prêts à valider) |
| `Transforme cette idée en carrousel` | Brief complet pour Canva/Figma |
| `Écris un article long sur [thème]` | Article 1500-3000 mots structuré |
| `Prépare un script vidéo sur [sujet]` | Script 60-120 sec avec notes de production |
| `Audite mon profil LinkedIn` | Analyse + propositions d'optimisation |
| `Décline ce post en [format]` | Adaptation cross-format |
| `Fais une veille sur [sujet]` | Recherche + angles de contenu suggérés |
| `Ajoute cette idée au backlog : [idée]` | Capture dans ideas-backlog.md |

## Structure du projet

```
cmo-agent/
├── CLAUDE.md                      ← Le cerveau de l'agent (lu automatiquement)
├── README.md                      ← Ce fichier
├── voice/                         ← Identité éditoriale
│   ├── tone-guide.md              ← Guide de tonalité détaillé
│   ├── vocabulary.md              ← Lexique et expressions clés
│   ├── anti-patterns.md           ← Ce qu'il ne faut JAMAIS écrire
│   └── examples/                  ← Posts de référence
├── content/                       ← Pipeline de contenu
│   ├── calendar.md                ← Calendrier éditorial
│   ├── ideas-backlog.md           ← File d'idées à traiter
│   ├── drafts/                    ← Brouillons en attente
│   ├── published/                 ← Archive des publiés
│   └── templates/                 ← Templates de production
├── profile/                       ← Gestion du profil LinkedIn
│   ├── current-profile.md         ← Snapshot + audit du profil
│   └── audit-history.md           ← Historique des optimisations
└── intelligence/                  ← Veille et analyse
    ├── performance-log.md         ← Suivi des métriques
    ├── trends.md                  ← Tendances sectorielles
    └── competitors.md             ← Veille créateurs
```

## Workflow hebdomadaire recommandé

1. **Lundi** → `Prépare ma semaine de contenu`
2. **Lundi soir** → Tu valides/ajustes le plan
3. **Mardi-Jeudi** → Tu publies (copier-coller)
4. **Vendredi** → Tu notes les performances dans `performance-log.md`
5. **Mensuel** → Revue des performances + mise à jour du CLAUDE.md

## Évolution

Le `CLAUDE.md` est un document vivant. Plus tu l'enrichis avec tes retours, meilleur devient l'agent. Après chaque revue mensuelle, ajoute :
- Les formulations qui ont bien fonctionné
- Les sujets qui ont résonné avec ton audience
- Les ajustements de ton ou de style
