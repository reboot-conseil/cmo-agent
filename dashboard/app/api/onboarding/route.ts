import { auth } from '@clerk/nextjs/server'
import { storagePut } from '@/lib/storage'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    nom: string; poste: string; entreprise: string; secteur: string
    experiences: string; differentiation: string
    mission: string; convictions: string
    cible: string; douleur: string; attente: string
    registre: string; antipatterns: string; exemple_formulation: string
  }

  if (!body.nom?.trim() || !body.poste?.trim()) {
    return NextResponse.json({ error: 'nom et poste requis' }, { status: 400 })
  }

  const prompt = `Tu es un expert en personal branding LinkedIn et en stratégie éditoriale.
À partir du profil ci-dessous, génère un document de stratégie éditoriale complet en Markdown.

## Profil fourni

**Nom :** ${body.nom}
**Poste :** ${body.poste}${body.entreprise ? ` — ${body.entreprise}` : ''}
${body.secteur ? `**Secteur :** ${body.secteur}` : ''}

**Expériences marquantes :**
${body.experiences}

**Ce qui rend unique :**
${body.differentiation || 'Non précisé'}

**Mission éditoriale :**
${body.mission}

**Convictions fortes :**
${body.convictions}

**Cible principale :** ${body.cible}
**Problème principal de la cible :** ${body.douleur}
**Ce qu'ils cherchent :** ${body.attente || 'Non précisé'}

**Registre :** ${body.registre}
**Anti-patterns (à éviter absolument) :** ${body.antipatterns || 'Non précisé'}
**Exemple de formulation qui lui ressemble :** ${body.exemple_formulation || 'Non précisé'}

---

## Document à générer

Génère un fichier Markdown structuré avec exactement ces sections :

# Identité — [Nom]

## Poste & Contexte
[poste, entreprise, secteur]

## Parcours (matière narrative)
[résumé des expériences marquantes en 3-5 bullets — ce qui nourrit le contenu]

## Ce qui rend unique
[3 éléments différenciants concrets, formulés comme des faits]

## Mission éditoriale
[la mission en une phrase, reformulée si besoin pour qu'elle soit percutante]

## Convictions fortes
[les 2-3 thèses reformulées en assertions claires et mémorables]

## Audience cible
### Cible primaire
[rôle, douleur, ce qu'ils cherchent]
### Cible secondaire
[dérivé logiquement du profil]

## Piliers thématiques
[6 piliers adaptés au profil et au secteur, avec pourcentage et angle spécifique]

## Voix & Tonalité
[registre, marqueurs de style, ce qui sonnera toujours juste pour cette personne]

## Anti-patterns
[ce qu'il ne faut jamais faire — fond ET forme]

---
Sois précis, concret, et fidèle au profil fourni. Ne génère pas de contenu générique.
Le document doit lire comme s'il avait été écrit PAR cette personne pour décrire sa propre façon de communiquer.`

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const identityMd = message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  await storagePut(userId, 'identity.md', identityMd)
  return NextResponse.json({ ok: true })
}
