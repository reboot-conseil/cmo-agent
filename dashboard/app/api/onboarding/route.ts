import { auth } from '@clerk/nextjs/server'
import { storagePut } from '@/lib/storage'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  

  const { nom, poste, entreprise, mission } = await request.json() as {
    nom: string
    poste: string
    entreprise: string
    mission: string
  }

  if (!nom?.trim() || !poste?.trim()) {
    return NextResponse.json({ error: 'nom et poste requis' }, { status: 400 })
  }

  const identityMd = `# Identité — ${nom}

## Poste
${poste}${entreprise ? ` — ${entreprise}` : ''}

## Mission éditoriale
${mission || 'À définir'}

## Piliers thématiques
- IA & Transformation (25%)
- Stratégie & Décision (20%)
- Business & ROI (20%)
- Neurosciences & Adoption (15%)
- Innovation & Prospective (10%)
- Coulisses & Authenticité (10%)

## Voix
Assertif mais humble. Enthousiaste mais ancré. Direct et structuré.
`

  await storagePut(userId, 'config/identity.md', identityMd)
  return NextResponse.json({ ok: true })
}
