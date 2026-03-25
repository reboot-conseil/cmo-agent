import type { Idea, IdeaStatus, Format, Jour } from './types'
import { storageGet, storagePut, storageDelete, storageList } from './storage'

const IDEAS_PREFIX = 'content/ideas'

// ─── Slug ─────────────────────────────────────────────────────────────────────

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
}

// ─── Section extraction ───────────────────────────────────────────────────────

export function extractSection(content: string, heading: string): string {
  const lines = content.split('\n')
  let inSection = false
  const result: string[] = []

  for (const line of lines) {
    if (line.match(new RegExp(`^##\\s+${heading}\\s*$`))) {
      inSection = true
      continue
    }
    if (inSection && line.startsWith('## ')) break
    if (inSection) result.push(line)
  }

  return result.join('\n').trim()
}

// ─── Hashtags ─────────────────────────────────────────────────────────────────

export function parseHashtags(text: string): string[] {
  if (!text.trim()) return []
  return text.trim().split(/\s+/).filter(t => t.startsWith('#'))
}

// ─── Frontmatter (manual parse — no external dep needed) ─────────────────────

function parseFrontmatter(content: string): { data: Record<string, unknown>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return { data: {}, body: content }
  const data: Record<string, unknown> = {}
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const val = line.slice(colonIdx + 1).trim()
    if (val === 'null') data[key] = null
    else if (/^\d+$/.test(val)) data[key] = parseInt(val, 10)
    else data[key] = val
  }
  return { data, body: match[2] }
}

// ─── Parse idea file ──────────────────────────────────────────────────────────

export function parseIdeaFile(content: string, slug: string): Idea {
  const { data, body } = parseFrontmatter(content)

  const visuelRaw = extractSection(body, 'Visuel')
  const typeMatch = visuelRaw.match(/\*\*Type\s*:\*\*\s*(.+)/)
  const visuelType = typeMatch ? typeMatch[1].trim() : ''
  const visuelDescription = visuelRaw
    .split('\n')
    .filter(l => !l.match(/^\*\*Type\s*:\*\*/))
    .join('\n')
    .trim()

  return {
    slug: (data.slug as string) ?? slug,
    sujet: (data.sujet as string) ?? '',
    pilier: (data.pilier as string) ?? '',
    format: (data.format as Format) ?? 'Post',
    statut: (data.statut as IdeaStatus) ?? 'raw',
    semaine: data.semaine as number | null,
    jour: (data.jour as Jour) ?? null,
    createdAt: (data.createdAt as string) ?? new Date().toISOString().split('T')[0],
    hook: extractSection(body, 'Hook'),
    texte: extractSection(body, 'Texte'),
    visuelType,
    visuelDescription,
    hashtags: parseHashtags(extractSection(body, 'Hashtags')),
    campagne: data.campagne ? (data.campagne as string) : undefined,
  }
}

// ─── Serialize idea → markdown ────────────────────────────────────────────────

export function serializeIdea(idea: Idea): string {
  const fm = [
    '---',
    `slug: ${idea.slug}`,
    `sujet: ${idea.sujet}`,
    `pilier: ${idea.pilier}`,
    `format: ${idea.format}`,
    `statut: ${idea.statut}`,
    `semaine: ${idea.semaine ?? 'null'}`,
    `jour: ${idea.jour ?? 'null'}`,
    `createdAt: ${idea.createdAt}`,
    ...(idea.campagne ? [`campagne: ${idea.campagne}`] : []),
    '---',
    '',
  ].join('\n')

  const sections: string[] = []

  if (idea.hook) sections.push(`## Hook\n\n${idea.hook}\n`)
  if (idea.texte) sections.push(`## Texte\n\n${idea.texte}\n`)

  const visuelContent = [
    idea.visuelType ? `**Type :** ${idea.visuelType}` : null,
    idea.visuelDescription || null,
  ].filter(Boolean).join('\n\n')
  if (visuelContent) sections.push(`## Visuel\n\n${visuelContent}\n`)

  if (idea.hashtags.length) sections.push(`## Hashtags\n\n${idea.hashtags.join(' ')}\n`)

  return fm + sections.join('\n')
}

// ─── File I/O ─────────────────────────────────────────────────────────────────

export async function readIdea(userId: string, slug: string): Promise<Idea | null> {
  const content = await storageGet(userId, `${IDEAS_PREFIX}/${slug}.md`)
  if (!content) return null
  return parseIdeaFile(content, slug)
}

export async function writeIdea(userId: string, idea: Idea): Promise<void> {
  await storagePut(userId, `${IDEAS_PREFIX}/${idea.slug}.md`, serializeIdea(idea))
}

export async function deleteIdea(userId: string, slug: string): Promise<void> {
  await storageDelete(userId, `${IDEAS_PREFIX}/${slug}.md`)
}

export async function listIdeas(userId: string): Promise<Idea[]> {
  const paths = await storageList(userId, `${IDEAS_PREFIX}/`)
  const ideaPaths = paths.filter(p => p.endsWith('.md') && !p.includes('test-'))
  const ideas = await Promise.all(
    ideaPaths.map(async p => {
      const slug = p.replace(`${IDEAS_PREFIX}/`, '').replace('.md', '')
      return readIdea(userId, slug)
    })
  )
  return ideas
    .filter((i): i is Idea => i !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
