import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parseIdeaFile,
  serializeIdea,
  extractSection,
  parseHashtags,
  slugify,
  readIdea,
  writeIdea,
} from './parse-ideas'
import type { Idea } from './types'

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

const SAMPLE_CONTENT = `---
slug: test-idea-sample
sujet: Pourquoi 80% des projets IA échouent
pilier: IA & Transformation
format: Post
statut: draft
semaine: 2
jour: Mar
createdAt: 2026-03-17
---

## Hook

« Ce n'est presque jamais un problème de technologie. »

## Texte

J'ai accompagné des dizaines d'organisations sur leurs projets IA.

## Visuel

**Type :** Photo authentique

Photo de Jonathan en formation, tableau blanc visible.

## Hashtags

#IntelligenceArtificielle #StratégieIA #Leadership
`

describe('parseIdeaFile', () => {
  it('parses frontmatter fields', () => {
    const idea = parseIdeaFile(SAMPLE_CONTENT, 'test-idea-sample')
    expect(idea.slug).toBe('test-idea-sample')
    expect(idea.sujet).toBe('Pourquoi 80% des projets IA échouent')
    expect(idea.pilier).toBe('IA & Transformation')
    expect(idea.format).toBe('Post')
    expect(idea.statut).toBe('draft')
    expect(idea.semaine).toBe(2)
    expect(idea.jour).toBe('Mar')
    expect(idea.createdAt).toBe('2026-03-17')
  })

  it('extracts hook section', () => {
    const idea = parseIdeaFile(SAMPLE_CONTENT, 'test-idea-sample')
    expect(idea.hook).toBe('« Ce n\'est presque jamais un problème de technologie. »')
  })

  it('extracts texte section', () => {
    const idea = parseIdeaFile(SAMPLE_CONTENT, 'test-idea-sample')
    expect(idea.texte).toContain('J\'ai accompagné')
  })

  it('extracts visuelType from **Type :** line', () => {
    const idea = parseIdeaFile(SAMPLE_CONTENT, 'test-idea-sample')
    expect(idea.visuelType).toBe('Photo authentique')
  })

  it('extracts visuelDescription without the **Type:** line', () => {
    const idea = parseIdeaFile(SAMPLE_CONTENT, 'test-idea-sample')
    expect(idea.visuelDescription).toContain('Photo de Jonathan')
    expect(idea.visuelDescription).not.toContain('**Type :**')
  })

  it('parses hashtags array', () => {
    const idea = parseIdeaFile(SAMPLE_CONTENT, 'test-idea-sample')
    expect(idea.hashtags).toContain('#IntelligenceArtificielle')
    expect(idea.hashtags).toContain('#StratégieIA')
    expect(idea.hashtags).toHaveLength(3)
  })

  it('handles null semaine and jour', () => {
    const content = SAMPLE_CONTENT.replace('semaine: 2', 'semaine: null').replace('jour: Mar', 'jour: null')
    const idea = parseIdeaFile(content, 'test-idea-sample')
    expect(idea.semaine).toBeNull()
    expect(idea.jour).toBeNull()
  })

  it('handles missing optional sections gracefully', () => {
    const minimal = `---
slug: minimal
sujet: Idée brute
pilier: Stratégie & Décision
format: Post
statut: raw
semaine: null
jour: null
createdAt: 2026-03-17
---
`
    const idea = parseIdeaFile(minimal, 'minimal')
    expect(idea.hook).toBe('')
    expect(idea.texte).toBe('')
    expect(idea.visuelType).toBe('')
    expect(idea.visuelDescription).toBe('')
    expect(idea.hashtags).toEqual([])
  })

  it('reads campagne field when present', () => {
    const content = SAMPLE_CONTENT.replace(
      'createdAt: 2026-03-17',
      'createdAt: 2026-03-17\ncampagne: mini-series-ia'
    )
    const idea = parseIdeaFile(content, 'test-idea-sample')
    expect(idea.campagne).toBe('mini-series-ia')
  })

  it('campagne is undefined when absent', () => {
    const idea = parseIdeaFile(SAMPLE_CONTENT, 'test-idea-sample')
    expect(idea.campagne).toBeUndefined()
  })
})

describe('extractSection', () => {
  it('returns content between two ## headings', () => {
    const result = extractSection(SAMPLE_CONTENT, 'Hook')
    expect(result).toContain('Ce n\'est presque jamais')
  })

  it('returns empty string for missing section', () => {
    expect(extractSection(SAMPLE_CONTENT, 'Nonexistent')).toBe('')
  })
})

describe('parseHashtags', () => {
  it('splits space-separated hashtags', () => {
    expect(parseHashtags('#IA #Transformation #Leadership')).toEqual(['#IA', '#Transformation', '#Leadership'])
  })

  it('returns empty array for empty string', () => {
    expect(parseHashtags('')).toEqual([])
  })
})

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('Pourquoi les projets IA échouent')).toMatch(/^[a-z0-9-]+$/)
  })

  it('removes accents', () => {
    const result = slugify('Stratégie & Décision')
    expect(result).not.toContain('é')
  })

  it('truncates to 60 chars', () => {
    const long = 'a'.repeat(100)
    expect(slugify(long).length).toBeLessThanOrEqual(60)
  })
})

describe('readIdea', () => {
  it('returns idea when blob exists', async () => {
    mockStorage.storageGet.mockResolvedValue(SAMPLE_CONTENT)
    const idea = await readIdea('user_123', 'test-idea-sample')
    expect(idea?.slug).toBe('test-idea-sample')
    expect(mockStorage.storageGet).toHaveBeenCalledWith('user_123', 'content/ideas/test-idea-sample.md')
  })

  it('returns null when blob does not exist', async () => {
    mockStorage.storageGet.mockResolvedValue(null)
    const idea = await readIdea('user_123', 'missing')
    expect(idea).toBeNull()
  })
})

describe('writeIdea', () => {
  it('calls storagePut with correct path and serialized content', async () => {
    mockStorage.storagePut.mockResolvedValue(undefined)
    const idea: Idea = {
      slug: 'my-idea', sujet: 'Test', pilier: 'IA & Transformation',
      format: 'Post', statut: 'raw', semaine: null, jour: null,
      createdAt: '2026-01-01', hook: '', texte: '', visuelType: '',
      visuelDescription: '', hashtags: [],
    }
    await writeIdea('user_123', idea)
    expect(mockStorage.storagePut).toHaveBeenCalledWith(
      'user_123', 'content/ideas/my-idea.md', expect.stringContaining('slug: my-idea')
    )
  })
})

describe('serializeIdea', () => {
  it('round-trips through parse → serialize → parse', () => {
    const original = parseIdeaFile(SAMPLE_CONTENT, 'test-idea-sample')
    const serialized = serializeIdea(original)
    const reparsed = parseIdeaFile(serialized, 'test-idea-sample')
    expect(reparsed.sujet).toBe(original.sujet)
    expect(reparsed.hook).toBe(original.hook)
    expect(reparsed.hashtags).toEqual(original.hashtags)
    expect(reparsed.semaine).toBe(original.semaine)
  })

  it('round-trips campagne field', () => {
    const content = SAMPLE_CONTENT.replace(
      'createdAt: 2026-03-17',
      'createdAt: 2026-03-17\ncampagne: mini-series-ia'
    )
    const original = parseIdeaFile(content, 'test-idea-sample')
    const serialized = serializeIdea(original)
    const reparsed = parseIdeaFile(serialized, 'test-idea-sample')
    expect(reparsed.campagne).toBe('mini-series-ia')
  })
})
