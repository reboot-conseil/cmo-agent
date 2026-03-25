'use client'
import { useState, useEffect } from 'react'
import type { ProposedCampaign, GeneratePlanResponse, Campaign, CampaignGenerateRequest, GenerationEntry } from '@/lib/types'

const STORAGE_KEY = 'strategy-planner-state'

type Step = 'params' | 'review' | 'generating' | 'done'

type StrategyState = {
  step: Step
  semaines: number
  contexte: string
  proposedCampaigns: ProposedCampaign[]
  selectedIndices: Set<number>
  progress: { current: number; total: number; currentTitle: string }
  error: string | null
  result: { campaignsCreated: number; episodesGenerated: number } | null
}

const INITIAL_STATE: StrategyState = {
  step: 'params',
  semaines: 12,
  contexte: '',
  proposedCampaigns: [],
  selectedIndices: new Set(),
  progress: { current: 0, total: 0, currentTitle: '' },
  error: null,
  result: null,
}

function loadState(): StrategyState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return INITIAL_STATE
    const parsed = JSON.parse(raw)
    return { ...INITIAL_STATE, ...parsed, selectedIndices: new Set(parsed.selectedIndices ?? []) }
  } catch {
    return INITIAL_STATE
  }
}

function saveState(s: StrategyState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...s, selectedIndices: [...s.selectedIndices] }))
  } catch { /* ignore */ }
}

export function StrategyPlanner() {
  const [state, setState] = useState<StrategyState>(INITIAL_STATE)

  useEffect(() => {
    setState(loadState())
  }, [])

  useEffect(() => {
    saveState(state)
  }, [state])

  // ── Bloc 1 ──────────────────────────────────────────────────────────────────

  async function handleGeneratePlan() {
    setState(s => ({ ...s, error: null, step: 'review', proposedCampaigns: [] }))
    try {
      const res = await fetch('/api/strategy/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ semaines: state.semaines, contexte: state.contexte || undefined }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data: GeneratePlanResponse = await res.json()
      setState(s => ({
        ...s,
        proposedCampaigns: data.campaigns,
        selectedIndices: new Set(data.campaigns.map((_, i) => i)),
      }))
    } catch (e) {
      setState(s => ({ ...s, step: 'params', error: String(e) }))
    }
  }

  // ── Bloc 2 ──────────────────────────────────────────────────────────────────

  async function handleGenerateCampaigns() {
    const selected = state.proposedCampaigns.filter((_, i) => state.selectedIndices.has(i))
    setState(s => ({
      ...s,
      step: 'generating',
      progress: { current: 0, total: selected.length, currentTitle: selected[0]?.titre ?? '' },
    }))

    const generationEntries: Array<{ titre: string; pilier: string; episodesCount: number }> = []

    try {
      for (let i = 0; i < selected.length; i++) {
        const proposed = selected[i]
        setState(s => ({
          ...s,
          progress: { current: i + 1, total: selected.length, currentTitle: proposed.titre },
        }))

        // Step A: create campaign (slug generated server-side)
        const createRes = await fetch('/api/campagnes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ titre: proposed.titre, format: proposed.format, duree: proposed.duree }),
        })
        if (!createRes.ok) throw new Error(`Erreur création campagne "${proposed.titre}": ${await createRes.text()}`)
        const campaign: Campaign = await createRes.json()

        // Step B: generate content (returns Campaign with episodesSlug filled)
        const generateBody: CampaignGenerateRequest = {
          slug: campaign.slug,
          titre: proposed.titre,
          format: proposed.format,
          duree: proposed.duree,
          objectif: proposed.objectif,
          contexte: undefined,
        }
        const generateRes = await fetch('/api/campagnes/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(generateBody),
        })
        if (!generateRes.ok) throw new Error(`Erreur génération "${proposed.titre}": ${await generateRes.text()}`)
        const updatedCampaign: Campaign = await generateRes.json()

        generationEntries.push({
          titre: proposed.titre,
          pilier: proposed.pilier,
          episodesCount: updatedCampaign.episodesSlug.length,
        })
      }

      // Update log
      const entry: GenerationEntry = {
        date: new Date().toISOString().split('T')[0],
        semaines: state.semaines,
        campaigns: generationEntries,
      }
      const logRes = await fetch('/api/strategy/update-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
      if (!logRes.ok) throw new Error(`Erreur mise à jour du log : ${await logRes.text()}`)

      const totalEpisodes = generationEntries.reduce((sum, c) => sum + c.episodesCount, 0)
      setState(s => ({
        ...s,
        step: 'done',
        result: { campaignsCreated: selected.length, episodesGenerated: totalEpisodes },
      }))
    } catch (e) {
      setState(s => ({ ...s, step: 'review', error: String(e) }))
    }
  }

  // ── Toggle helpers ───────────────────────────────────────────────────────────

  function toggleCampaign(i: number) {
    setState(s => {
      const next = new Set(s.selectedIndices)
      next.has(i) ? next.delete(i) : next.add(i)
      return { ...s, selectedIndices: next }
    })
  }

  function toggleAll() {
    setState(s => ({
      ...s,
      selectedIndices: s.selectedIndices.size === s.proposedCampaigns.length
        ? new Set()
        : new Set(s.proposedCampaigns.map((_, i) => i)),
    }))
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    padding: '16px 20px',
    marginBottom: 12,
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--color-primary)' }}>
        ⊕ Moteur Stratégique
      </h1>
      <p style={{ color: 'var(--color-muted-foreground)', marginBottom: 32, fontSize: 14 }}>
        L'agent CMO analyse votre positionnement et propose un plan de campagnes sur mesure.
      </p>

      {state.error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, padding: '12px 16px', marginBottom: 20, color: '#b91c1c', fontSize: 13 }}>
          {state.error}
        </div>
      )}

      {/* ── Step: params ─────────────────────────────────────────────────────── */}
      {state.step === 'params' && (
        <div style={{ maxWidth: 520 }}>
          <div style={cardStyle}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
              Nombre de semaines à planifier
            </label>
            <input
              type="number"
              min={1}
              max={24}
              value={state.semaines}
              onChange={e => setState(s => ({ ...s, semaines: Math.max(1, Math.min(24, parseInt(e.target.value) || 1)) }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 15, background: 'var(--color-background)' }}
            />
            <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', marginTop: 6 }}>Entre 1 et 24 semaines</p>
          </div>

          <div style={cardStyle}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
              Contexte optionnel
            </label>
            <textarea
              rows={4}
              placeholder="Ex: Lancement de la formation IA en avril, focus sur les dirigeants pharma ce trimestre..."
              value={state.contexte}
              onChange={e => setState(s => ({ ...s, contexte: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 13, background: 'var(--color-background)', resize: 'vertical' }}
            />
          </div>

          <button
            onClick={handleGeneratePlan}
            style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Générer le plan stratégique
          </button>
        </div>
      )}

      {/* ── Step: review (loading or loaded) ────────────────────────────────── */}
      {state.step === 'review' && (
        <div style={{ maxWidth: 680 }}>
          {state.proposedCampaigns.length === 0 ? (
            <div style={{ color: 'var(--color-muted-foreground)', fontSize: 14 }}>
              Analyse en cours — Claude lit votre positionnement et l'historique...
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>
                  Plan proposé pour {state.semaines} semaines — {state.proposedCampaigns.length} campagnes
                </h2>
                <button
                  onClick={toggleAll}
                  style={{ fontSize: 13, background: 'none', border: '1px solid var(--color-border)', borderRadius: 5, padding: '5px 12px', cursor: 'pointer', color: 'var(--color-muted-foreground)' }}
                >
                  {state.selectedIndices.size === state.proposedCampaigns.length ? 'Tout déselectionner' : 'Tout sélectionner'}
                </button>
              </div>

              {state.proposedCampaigns.map((c, i) => (
                <div
                  key={i}
                  style={{ ...cardStyle, opacity: state.selectedIndices.has(i) ? 1 : 0.5, cursor: 'pointer' }}
                  onClick={() => toggleCampaign(i)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <input
                      type="checkbox"
                      checked={state.selectedIndices.has(i)}
                      onChange={() => toggleCampaign(i)}
                      onClick={e => e.stopPropagation()}
                      style={{ marginTop: 3, cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{c.titre}</span>
                        <span style={{ fontSize: 11, background: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>{c.format}</span>
                        <span style={{ fontSize: 11, color: 'var(--color-muted-foreground)' }}>{c.duree} mois</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)', marginBottom: 6 }}>{c.pilier}</div>
                      <div style={{ fontSize: 13, color: 'var(--color-foreground)' }}>{c.objectif}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)', marginTop: 6, fontStyle: 'italic' }}>{c.rationale}</div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                disabled={state.selectedIndices.size === 0}
                onClick={handleGenerateCampaigns}
                style={{
                  marginTop: 8,
                  background: state.selectedIndices.size === 0 ? 'var(--color-border)' : 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: state.selectedIndices.size === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Générer {state.selectedIndices.size} campagne{state.selectedIndices.size > 1 ? 's' : ''} sélectionnée{state.selectedIndices.size > 1 ? 's' : ''}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Step: generating ────────────────────────────────────────────────── */}
      {state.step === 'generating' && (
        <div style={{ maxWidth: 520 }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
              Campagne {state.progress.current}/{state.progress.total} — {state.progress.currentTitle}
            </div>
            <div style={{ background: 'var(--color-border)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                background: 'var(--color-primary)',
                width: `${(state.progress.current / state.progress.total) * 100}%`,
                transition: 'width 0.4s ease',
              }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)', marginTop: 8 }}>
              Génération du contenu en cours...
            </div>
          </div>
        </div>
      )}

      {/* ── Step: done ──────────────────────────────────────────────────────── */}
      {state.step === 'done' && state.result && (
        <div style={{ maxWidth: 520 }}>
          <div style={{ ...cardStyle, borderColor: 'var(--color-primary)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--color-primary)' }}>
              Génération terminée
            </div>
            <div style={{ fontSize: 14, color: 'var(--color-foreground)', marginBottom: 16 }}>
              {state.result.campaignsCreated} campagne{state.result.campaignsCreated > 1 ? 's' : ''} créée{state.result.campaignsCreated > 1 ? 's' : ''} — {state.result.episodesGenerated} épisodes générés
            </div>
            <a
              href="/campagnes"
              style={{ display: 'inline-block', background: 'var(--color-primary)', color: '#fff', textDecoration: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 14, fontWeight: 600 }}
            >
              Voir dans le backlog →
            </a>
          </div>
          <button
            onClick={() => { localStorage.removeItem(STORAGE_KEY); setState(INITIAL_STATE) }}
            style={{ marginTop: 12, fontSize: 13, background: 'none', border: '1px solid var(--color-border)', borderRadius: 5, padding: '6px 14px', cursor: 'pointer', color: 'var(--color-muted-foreground)' }}
          >
            Nouveau plan
          </button>
        </div>
      )}
    </div>
  )
}
