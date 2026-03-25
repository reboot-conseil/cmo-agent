import type { VisionData, VisionResponse } from './types'
import { storageGet, storagePut } from './storage'

const VISION_PATH = 'content/strategy/vision.md'

// ─── Pure helpers (exported for tests) ─────────────────────────────────────

export function extractJsonFromVisionSection(content: string): VisionResponse | null {
  const normalized = content.replace(/\r\n/g, '\n')
  const visionMatch = normalized.match(/## Vision IA\n([\s\S]*?)(?=\n## |$)/)
  if (!visionMatch) return null
  const jsonMatch = visionMatch[1].match(/```json\n([\s\S]*?)\n```/)
  if (!jsonMatch) return null
  try {
    return JSON.parse(jsonMatch[1]) as VisionResponse
  } catch {
    return null
  }
}

export function extractNoteSection(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n')
  const noteMatch = normalized.match(/## Note Jonathan\n\n([\s\S]*)$/)
  if (!noteMatch) return ''
  return noteMatch[1].trim()
}

export function serializeVisionFile(
  vision: VisionResponse,
  note: string,
  generatedAt: string,
): string {
  return `---
generatedAt: ${generatedAt}
---

## Vision IA

\`\`\`json
${JSON.stringify(vision, null, 2)}
\`\`\`

## Note Jonathan

${note}
`
}

// ─── Filesystem IO ──────────────────────────────────────────────────────────

export async function readVision(userId: string): Promise<VisionData> {
  try {
    const content = await storageGet(userId, VISION_PATH)
    if (!content) return { visionIA: null, noteJonathan: '', generatedAt: null }
    const visionIA = extractJsonFromVisionSection(content)
    const noteJonathan = extractNoteSection(content)
    const generatedAtMatch = content.match(/generatedAt:\s*(.+)/)
    const generatedAt = generatedAtMatch ? generatedAtMatch[1].trim() : null
    return { visionIA, noteJonathan, generatedAt }
  } catch {
    return { visionIA: null, noteJonathan: '', generatedAt: null }
  }
}

export async function saveVision(userId: string, vision: VisionResponse, generatedAt: string): Promise<void> {
  const existing = await storageGet(userId, VISION_PATH)
  const existingNote = existing ? extractNoteSection(existing) : ''
  await storagePut(userId, VISION_PATH, serializeVisionFile(vision, existingNote, generatedAt))
}

export async function saveNote(userId: string, note: string): Promise<void> {
  const content = await storageGet(userId, VISION_PATH)
  let vision: VisionResponse | null = null
  let generatedAt = ''
  if (content) {
    vision = extractJsonFromVisionSection(content)
    const m = content.match(/generatedAt:\s*(.+)/)
    generatedAt = m ? m[1].trim() : ''
  }
  if (vision) {
    await storagePut(userId, VISION_PATH, serializeVisionFile(vision, note, generatedAt))
  } else {
    const skeleton = `---
generatedAt: ${generatedAt || 'n/a'}
---

## Vision IA

## Note Jonathan

${note}
`
    await storagePut(userId, VISION_PATH, skeleton)
  }
}
