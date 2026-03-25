import { describe, it, expect } from 'vitest'
import { extractJsonFromVisionSection, extractNoteSection, serializeVisionFile } from './vision'
import type { VisionResponse } from './types'

const SAMPLE_VISION: VisionResponse = {
  situationActuelle: 'Jonathan publie régulièrement sur LinkedIn.',
  directionRecommandee: 'Aller vers plus de cas terrain.',
  priorites: ['IA & Transformation', 'Business & ROI'],
  themesAEviter: ['Hype IA générique'],
  coherence: 'Bon alignement avec CLAUDE.md.',
}

const SAMPLE_FILE = `---
generatedAt: 2026-03-18
---

## Vision IA

\`\`\`json
${JSON.stringify(SAMPLE_VISION, null, 2)}
\`\`\`

## Note Jonathan

Mon contexte personnel ici.
`

describe('extractJsonFromVisionSection', () => {
  it('parses VisionResponse from vision.md content', () => {
    const result = extractJsonFromVisionSection(SAMPLE_FILE)
    expect(result).not.toBeNull()
    expect(result!.situationActuelle).toBe('Jonathan publie régulièrement sur LinkedIn.')
    expect(result!.priorites).toHaveLength(2)
  })

  it('returns null when no json block present', () => {
    const result = extractJsonFromVisionSection('## Vision IA\n\nRien ici.')
    expect(result).toBeNull()
  })

  it('returns null when json block is invalid JSON', () => {
    const result = extractJsonFromVisionSection('## Vision IA\n\n```json\nnot-valid\n```')
    expect(result).toBeNull()
  })
})

describe('extractNoteSection', () => {
  it('extracts the note Jonathan content', () => {
    const note = extractNoteSection(SAMPLE_FILE)
    expect(note.trim()).toBe('Mon contexte personnel ici.')
  })

  it('returns empty string when no Note Jonathan section', () => {
    const note = extractNoteSection('## Vision IA\n\nSomething')
    expect(note).toBe('')
  })
})

describe('serializeVisionFile', () => {
  it('produces a file with frontmatter, json block, and note', () => {
    const output = serializeVisionFile(SAMPLE_VISION, 'Ma note', '2026-03-18')
    expect(output).toContain('generatedAt: 2026-03-18')
    expect(output).toContain('```json')
    expect(output).toContain('situationActuelle')
    expect(output).toContain('## Note Jonathan')
    expect(output).toContain('Ma note')
  })

  it('preserves empty note', () => {
    const output = serializeVisionFile(SAMPLE_VISION, '', '2026-03-18')
    expect(output).toMatch(/## Note Jonathan\n\n\n$/)
  })

  it('round-trips: serialize then parse gives original vision', () => {
    const serialized = serializeVisionFile(SAMPLE_VISION, 'note', '2026-03-18')
    const parsed = extractJsonFromVisionSection(serialized)
    expect(parsed).toEqual(SAMPLE_VISION)
  })
})
