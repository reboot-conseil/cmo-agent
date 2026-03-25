import { describe, it, expect } from 'vitest'
import { parseLogEntries, serializeLogEntry, truncateToLastN } from './generation-log'
import type { GenerationEntry } from './types'

const SAMPLE_LOG = `---
lastGeneration: 2026-03-01
totalPostsGenerated: 36
---

## Générations

### 2026-03-01 — Plan 12 semaines

- Campagnes créées : 4
- Posts générés : 36
- Piliers couverts : IA & Transformation (12), Stratégie & Décision (8), Business & ROI (8), Coulisses & Authenticité (8)
- Sujets principaux : POC IA, Résistance au changement, ROI formation IA, Coulisses Reboot

### 2026-03-10 — Plan 4 semaines

- Campagnes créées : 1
- Posts générés : 8
- Piliers couverts : Innovation & Prospective (8)
- Sujets principaux : Tendances IA 2026
`

const ENTRY: GenerationEntry = {
  date: '2026-03-18',
  semaines: 8,
  campaigns: [
    { titre: 'POC en 5 jours', pilier: 'Business & ROI', episodesCount: 6 },
    { titre: 'IA et RH', pilier: 'IA & Transformation', episodesCount: 4 },
  ],
}

describe('parseLogEntries', () => {
  it('returns array of entry text blocks', () => {
    const entries = parseLogEntries(SAMPLE_LOG)
    expect(entries).toHaveLength(2)
    expect(entries[0]).toContain('2026-03-01')
    expect(entries[1]).toContain('2026-03-10')
  })

  it('returns empty array for log with no entries', () => {
    const entries = parseLogEntries('---\nlastGeneration: \ntotalPostsGenerated: 0\n---\n\n## Générations\n')
    expect(entries).toHaveLength(0)
  })
})

describe('truncateToLastN', () => {
  it('returns last N entries', () => {
    const entries = parseLogEntries(SAMPLE_LOG)
    const truncated = truncateToLastN(entries, 1)
    expect(truncated).toHaveLength(1)
    expect(truncated[0]).toContain('2026-03-10')
  })

  it('returns all entries when fewer than N exist', () => {
    const entries = parseLogEntries(SAMPLE_LOG)
    const truncated = truncateToLastN(entries, 10)
    expect(truncated).toHaveLength(2)
  })
})

describe('serializeLogEntry', () => {
  it('produces a formatted markdown entry', () => {
    const text = serializeLogEntry(ENTRY)
    expect(text).toContain('### 2026-03-18 — Plan 8 semaines')
    expect(text).toContain('Campagnes créées : 2')
    expect(text).toContain('Posts générés : 10')
    expect(text).toContain('POC en 5 jours')
    expect(text).toContain('IA et RH')
  })
})
