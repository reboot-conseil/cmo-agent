import matter from 'gray-matter'
import type { Campaign, CampaignStatus, Format } from './types'
import { extractSection } from './parse-ideas'
import { storageGet, storagePut, storageDelete, storageList } from './storage'

const CAMPAIGNS_PREFIX = 'content/campagnes'

export function parseCampaignFile(raw: string): Campaign {
  const { data, content } = matter(raw)
  return {
    slug: String(data.slug ?? ''),
    titre: String(data.titre ?? ''),
    format: (data.format as Format | 'Mix') ?? 'Post',
    duree: Number(data.duree ?? 1),
    objectif: String(data.objectif ?? ''),
    statut: (data.statut as CampaignStatus) ?? 'draft',
    createdAt: data.createdAt instanceof Date
      ? data.createdAt.toISOString().split('T')[0]
      : String(data.createdAt ?? new Date().toISOString().split('T')[0]),
    episodesSlug: Array.isArray(data.episodesSlug) ? (data.episodesSlug as string[]) : [],
    contexte: String(data.contexte ?? ''),
    brief: extractSection(content, 'Brief'),
    phases: extractSection(content, 'Phases'),
  }
}

export function serializeCampaign(c: Campaign): string {
  const frontmatter = {
    slug: c.slug,
    titre: c.titre,
    format: c.format,
    duree: c.duree,
    objectif: c.objectif,
    statut: c.statut,
    createdAt: c.createdAt,
    episodesSlug: c.episodesSlug,
    contexte: c.contexte,
  }
  const body = [
    c.brief ? `## Brief\n\n${c.brief}\n` : '',
    c.phases ? `## Phases\n\n${c.phases}\n` : '',
  ].filter(Boolean).join('\n')

  return matter.stringify(body, frontmatter)
}

export async function readCampaign(userId: string, slug: string): Promise<Campaign | null> {
  const raw = await storageGet(userId, `${CAMPAIGNS_PREFIX}/${slug}.md`)
  if (!raw) return null
  return parseCampaignFile(raw)
}

export async function writeCampaign(userId: string, campaign: Campaign): Promise<void> {
  await storagePut(userId, `${CAMPAIGNS_PREFIX}/${campaign.slug}.md`, serializeCampaign(campaign))
}

export async function deleteCampaign(userId: string, slug: string): Promise<void> {
  await storageDelete(userId, `${CAMPAIGNS_PREFIX}/${slug}.md`)
}

export async function listCampaigns(userId: string): Promise<Campaign[]> {
  const paths = await storageList(userId, `${CAMPAIGNS_PREFIX}/`)
  const results = await Promise.all(
    paths.filter(p => p.endsWith('.md')).map(async p => {
      const slug = p.replace(`${CAMPAIGNS_PREFIX}/`, '').replace('.md', '')
      return readCampaign(userId, slug)
    })
  )
  return results
    .filter((c): c is Campaign => c !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
