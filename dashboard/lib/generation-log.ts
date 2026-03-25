import type { GenerationEntry } from './types'
import { storageGet, storagePut } from './storage'

const LOG_PATH = 'content/strategy/generation-log.md'

// ─── Pure helpers (exported for tests) ────────────────────────────────────────

export function parseLogEntries(content: string): string[] {
  const sections = content.split(/(?=^### )/m)
  return sections.filter(s => s.startsWith('### ')).map(s => s.trim())
}

export function truncateToLastN(entries: string[], n: number): string[] {
  return entries.slice(-n)
}

export function serializeLogEntry(entry: GenerationEntry): string {
  const totalPosts = entry.campaigns.reduce((sum, c) => sum + c.episodesCount, 0)
  const campaignLines = entry.campaigns
    .map(c => `  - ${c.titre} [${c.pilier}] — ${c.episodesCount} épisodes`)
    .join('\n')
  return `### ${entry.date} — Plan ${entry.semaines} semaines

- Campagnes créées : ${entry.campaigns.length}
- Posts générés : ${totalPosts}
- Sujets principaux :
${campaignLines}`
}

// ─── Filesystem IO ─────────────────────────────────────────────────────────────

export async function readGenerationLog(userId: string): Promise<string> {
  try {
    const content = await storageGet(userId, LOG_PATH)
    if (!content) return 'Aucune génération précédente.'
    const entries = parseLogEntries(content)
    const last5 = truncateToLastN(entries, 5)
    if (last5.length === 0) return 'Aucune génération précédente.'
    return `Dernières générations (${last5.length}) :\n\n${last5.join('\n\n')}`
  } catch {
    return 'Aucune génération précédente.'
  }
}

export async function appendGenerationEntry(userId: string, entry: GenerationEntry): Promise<void> {
  const totalPosts = entry.campaigns.reduce((sum, c) => sum + c.episodesCount, 0)
  let content = await storageGet(userId, LOG_PATH)
    ?? `---\nlastGeneration: \ntotalPostsGenerated: 0\n---\n\n## Générations\n`

  const existingTotal = parseInt(content.match(/totalPostsGenerated:\s*(\d+)/)?.[1] ?? '0', 10)
  content = content
    .replace(/lastGeneration:.*/, `lastGeneration: ${entry.date}`)
    .replace(/totalPostsGenerated:\s*\d+/, `totalPostsGenerated: ${existingTotal + totalPosts}`)

  content = content.trimEnd() + '\n\n' + serializeLogEntry(entry) + '\n'
  await storagePut(userId, LOG_PATH, content)
}

export async function readFullGenerationLog(userId: string): Promise<string> {
  try {
    const content = await storageGet(userId, LOG_PATH)
    if (!content) return 'Aucune génération précédente.'
    const entries = parseLogEntries(content)
    if (entries.length === 0) return 'Aucune génération précédente.'
    return `Toutes les générations (${entries.length}) :\n\n${entries.join('\n\n')}`
  } catch {
    return 'Aucune génération précédente.'
  }
}
