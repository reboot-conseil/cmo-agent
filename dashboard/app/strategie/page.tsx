import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { StrategyFoundation } from '@/components/StrategyFoundation'
import { StrategyMemory } from '@/components/StrategyMemory'
import { readVision } from '@/lib/vision'
import { storageGet } from '@/lib/storage'
import type { CLAUDEMdSections } from '@/lib/types'

const ADMIN_USER_ID = process.env.ADMIN_USER_ID ?? ''

function parseCLAUDEMd(content: string): CLAUDEMdSections {
  // ── identite ─────────────────────────────────────────────────────────────
  // Extract from "### Mission éditoriale" to next "## " H2
  const identiteMatch = content.match(/### Mission éditoriale([\s\S]*?)(?=\n## )/)?.[0] ?? ''
  const identite = identiteMatch.replace(/\*\*/g, '').trim()

  // ── convictions ───────────────────────────────────────────────────────────
  // Find "### Convictions fortes" (inside §2), extract until next H3
  const convictionsBlock = content.match(/### Convictions fortes([\s\S]*?)(?=\n### |\n## |$)/)?.[1] ?? ''
  const convictions = convictionsBlock
    .split('\n')
    .filter(l => /^\d+\./.test(l.trim()))
    .map(l => l.replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').trim())
    .filter(Boolean)

  // ── piliers ───────────────────────────────────────────────────────────────
  // Extract "## 4. PILIERS THÉMATIQUES" until next "##"
  const piliersBlock = content.match(/## 4\. PILIERS THÉMATIQUES([\s\S]*?)(?=\n## )/)?.[1] ?? ''
  const piliers = piliersBlock
    .split('\n')
    .filter(l => /^\|/.test(l) && !/^[|\s-]+$/.test(l) && !/Pilier/.test(l) && !/^---/.test(l))
    .map(l => {
      const cols = l.split('|').map(c => c.trim()).filter(Boolean)
      if (cols.length < 4) return null
      const num = parseInt(cols[0], 10)
      const nom = cols[1].replace(/\*\*/g, '')
      const angle = cols[2]
      const frequence = cols[3]
      return isNaN(num) ? null : { num, nom, angle, frequence }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)

  // ── audience ──────────────────────────────────────────────────────────────
  // Extract "## 5. AUDIENCE CIBLE" until next "##"
  const audienceBlock = content.match(/## 5\. AUDIENCE CIBLE([\s\S]*?)(?=\n## )/)?.[1] ?? ''
  const audienceTypes = ['primaire', 'secondaire', 'tertiaire'] as const
  const audience = audienceTypes.map(type => {
    const header = type === 'primaire' ? 'Cible primaire' : type === 'secondaire' ? 'Cible secondaire' : 'Cible tertiaire'
    const block = audienceBlock.match(new RegExp(`### ${header}([\\s\\S]*?)(?=\\n### |$)`))?.[1] ?? ''
    const douleur = block.match(/\*\*Douleur principale :\*\*\s*(.+)/)?.[1]?.trim() ?? ''
    const cherche = block.match(/\*\*Ce qu'ils cherchent :\*\*\s*(.+)/)?.[1]?.trim() ?? ''
    return { type, douleur, cherche }
  })

  // ── voix ──────────────────────────────────────────────────────────────────
  // Extract only "### Marqueurs de voix à utiliser" until next H3
  const voixBlock = content.match(/### Marqueurs de voix à utiliser([\s\S]*?)(?=\n### |\n## |$)/)?.[1] ?? ''
  const voix = voixBlock.replace(/\*\*/g, '').trim()

  return { identite, convictions, piliers, audience, voix }
}

export default async function StrategiePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const isAdmin = userId === ADMIN_USER_ID

  const claudeMd = await storageGet(userId, 'identity.md') ?? ''
  const sections = parseCLAUDEMd(claudeMd)
  const visionData = await readVision(userId)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar isAdmin={isAdmin} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
        <StrategyFoundation sections={sections} />
        <StrategyMemory initialData={visionData} />
      </div>
    </div>
  )
}
