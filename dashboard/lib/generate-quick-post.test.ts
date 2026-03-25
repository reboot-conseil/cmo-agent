import { describe, it, expect } from 'vitest'
import { parseQuickPostResponse } from './generate-quick-post'

describe('parseQuickPostResponse', () => {
  it('parses a valid full JSON object', () => {
    const raw = JSON.stringify({
      pilier: 'IA & Transformation',
      format: 'Post',
      hook: "La plupart des dirigeants veulent de l'IA. Presque aucun ne sait par où commencer.",
      texte: "Voici ce que j'observe sur le terrain.\n\nLes PME arrivent avec trois profils...",
      visuelType: 'Photo authentique',
      visuelDescription: 'Jonathan en réunion client, regard direct',
      hashtags: ['#IA', '#Transformation', '#PME'],
    })
    const result = parseQuickPostResponse(raw)
    expect(result.pilier).toBe('IA & Transformation')
    expect(result.format).toBe('Post')
    expect(result.hook).toBe("La plupart des dirigeants veulent de l'IA. Presque aucun ne sait par où commencer.")
    expect(result.texte).toContain('terrain')
    expect(result.visuelType).toBe('Photo authentique')
    expect(result.hashtags).toEqual(['#IA', '#Transformation', '#PME'])
  })

  it('handles JSON wrapped in markdown fences', () => {
    const raw = '```json\n{"pilier":"Stratégie & Décision","format":"Carrousel","hook":"3 questions.","texte":"...","visuelType":"Slides carrousel","visuelDescription":"","hashtags":["#Strategie"]}\n```'
    const result = parseQuickPostResponse(raw)
    expect(result.pilier).toBe('Stratégie & Décision')
    expect(result.format).toBe('Carrousel')
    expect(result.visuelType).toBe('Slides carrousel')
  })

  it('returns fallback on unparseable response', () => {
    const result = parseQuickPostResponse('not json at all')
    expect(result.pilier).toBe('IA & Transformation')
    expect(result.format).toBe('Post')
    expect(result.hook).toBe('')
    expect(result.texte).toBe('')
    expect(result.hashtags).toEqual([])
  })

  it('returns fallback on missing fields', () => {
    const result = parseQuickPostResponse('{}')
    expect(result.pilier).toBe('IA & Transformation')
    expect(result.format).toBe('Post')
    expect(result.visuelType).toBe('Photo authentique')
  })
})
