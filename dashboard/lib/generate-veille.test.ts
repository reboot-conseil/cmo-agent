import { describe, it, expect } from 'vitest'
import { parseVeilleResponse } from './generate-veille'

describe('parseVeilleResponse', () => {
  it('parses a valid JSON array of 5 items', () => {
    const raw = JSON.stringify([
      {
        titre: 'OpenAI lance GPT-5',
        resume: 'OpenAI a annoncé GPT-5 cette semaine.',
        source: 'TechCrunch',
        pilier: 'IA & Transformation',
        urgence: 'haute',
        angleJonathan: "Ce que ça change concrètement pour une PME qui démarre l'IA"
      }
    ])
    const result = parseVeilleResponse(raw)
    expect(result).toHaveLength(1)
    expect(result[0].titre).toBe('OpenAI lance GPT-5')
    expect(result[0].urgence).toBe('haute')
  })

  it('handles JSON wrapped in markdown fences', () => {
    const raw = '```json\n[{"titre":"T","resume":"R","source":"S","pilier":"P","urgence":"basse","angleJonathan":"A"}]\n```'
    const result = parseVeilleResponse(raw)
    expect(result).toHaveLength(1)
  })

  it('returns empty array on unparseable response', () => {
    const result = parseVeilleResponse('not json at all')
    expect(result).toEqual([])
  })
})
