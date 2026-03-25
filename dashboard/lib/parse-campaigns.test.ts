import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseCampaignFile, serializeCampaign, readCampaign, writeCampaign } from './parse-campaigns'

vi.mock('./storage', () => ({
  storageGet: vi.fn(),
  storagePut: vi.fn(),
  storageDelete: vi.fn(),
  storageList: vi.fn(),
}))

import * as storage from './storage'
const mockStorage = storage as {
  storageGet: ReturnType<typeof vi.fn>
  storagePut: ReturnType<typeof vi.fn>
  storageDelete: ReturnType<typeof vi.fn>
  storageList: ReturnType<typeof vi.fn>
}

beforeEach(() => vi.clearAllMocks())

const SAMPLE_CAMPAIGN = `---
slug: mini-series-ia
titre: Mini-séries IA pour dirigeants
format: Vidéo
duree: 3
objectif: Positionnement expert + notoriété
statut: draft
createdAt: 2026-03-17
episodesSlug:
  - mini-series-ia-ep01-abc123
  - mini-series-ia-ep02-def456
contexte: "Audience : dirigeants PME"
---

## Brief

Description stratégique de la campagne.

## Phases

Mois 1-2 : Awareness → Mois 3 : Conversion
`

describe('parseCampaignFile', () => {
  it('parses scalar frontmatter fields', () => {
    const c = parseCampaignFile(SAMPLE_CAMPAIGN)
    expect(c.slug).toBe('mini-series-ia')
    expect(c.titre).toBe('Mini-séries IA pour dirigeants')
    expect(c.format).toBe('Vidéo')
    expect(c.duree).toBe(3)
    expect(c.statut).toBe('draft')
    expect(c.createdAt).toBe('2026-03-17')
    expect(c.objectif).toBe('Positionnement expert + notoriété')
    expect(c.contexte).toBe('Audience : dirigeants PME')
  })

  it('parses episodesSlug as array', () => {
    const c = parseCampaignFile(SAMPLE_CAMPAIGN)
    expect(c.episodesSlug).toEqual(['mini-series-ia-ep01-abc123', 'mini-series-ia-ep02-def456'])
  })

  it('parses brief section', () => {
    const c = parseCampaignFile(SAMPLE_CAMPAIGN)
    expect(c.brief).toContain('Description stratégique')
  })

  it('parses phases section', () => {
    const c = parseCampaignFile(SAMPLE_CAMPAIGN)
    expect(c.phases).toContain('Awareness')
  })

  it('handles empty episodesSlug', () => {
    const content = SAMPLE_CAMPAIGN.replace(/episodesSlug:[\s\S]*?contexte/, 'episodesSlug: []\ncontexte')
    const c = parseCampaignFile(content)
    expect(c.episodesSlug).toEqual([])
  })
})

describe('readCampaign', () => {
  it('returns campaign when blob exists', async () => {
    mockStorage.storageGet.mockResolvedValue(SAMPLE_CAMPAIGN)
    const c = await readCampaign('user_123', 'mini-series-ia')
    expect(c?.slug).toBe('mini-series-ia')
    expect(mockStorage.storageGet).toHaveBeenCalledWith('user_123', 'content/campagnes/mini-series-ia.md')
  })

  it('returns null when blob missing', async () => {
    mockStorage.storageGet.mockResolvedValue(null)
    expect(await readCampaign('user_123', 'missing')).toBeNull()
  })
})

describe('writeCampaign', () => {
  it('calls storagePut with correct path', async () => {
    mockStorage.storagePut.mockResolvedValue(undefined)
    const c = parseCampaignFile(SAMPLE_CAMPAIGN)
    await writeCampaign('user_123', c)
    expect(mockStorage.storagePut).toHaveBeenCalledWith(
      'user_123', 'content/campagnes/mini-series-ia.md', expect.any(String)
    )
  })
})

describe('serializeCampaign / parseCampaignFile round-trip', () => {
  it('round-trips all fields', () => {
    const original = parseCampaignFile(SAMPLE_CAMPAIGN)
    const serialized = serializeCampaign(original)
    const reparsed = parseCampaignFile(serialized)
    expect(reparsed.slug).toBe(original.slug)
    expect(reparsed.titre).toBe(original.titre)
    expect(reparsed.episodesSlug).toEqual(original.episodesSlug)
    expect(reparsed.brief).toBe(original.brief)
    expect(reparsed.phases).toBe(original.phases)
    expect(reparsed.contexte).toBe(original.contexte)
  })
})
