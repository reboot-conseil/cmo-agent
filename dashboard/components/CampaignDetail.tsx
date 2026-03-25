'use client'
import { useState } from 'react'
import type { Campaign } from '@/lib/types'
import { useCampaigns } from '@/context/CampaignContext'

export function CampaignDetail() {
  const { campaigns, setCampaigns, selectedSlug } = useCampaigns()
  const campaign = campaigns.find(c => c.slug === selectedSlug) ?? null

  const [editingBrief, setEditingBrief] = useState(false)
  const [briefDraft, setBriefDraft] = useState('')
  const [editingPhases, setEditingPhases] = useState(false)
  const [phasesDraft, setPhasesDraft] = useState('')
  const [saving, setSaving] = useState(false)

  if (!campaign) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted-foreground)', fontSize: 14 }}>
        Sélectionne une campagne
      </div>
    )
  }

  async function saveField(field: 'brief' | 'phases', value: string) {
    if (!campaign) return
    setSaving(true)
    try {
      const res = await fetch(`/api/campagnes/${campaign.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      const updated: Campaign = await res.json()
      setCampaigns(campaigns.map(c => c.slug === updated.slug ? updated : c))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{campaign.titre}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--color-muted-foreground)' }}>
          <span style={{ padding: '2px 8px', borderRadius: 10, background: 'var(--color-border)' }}>{campaign.format}</span>
          <span>{campaign.duree} mois</span>
          <span>·</span>
          <span>{campaign.objectif || 'Objectif non défini'}</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Brief */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Brief stratégique</span>
            <button onClick={() => { setEditingBrief(true); setBriefDraft(campaign.brief) }}
              style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-muted-foreground)' }}>
              Éditer
            </button>
          </div>
          {editingBrief ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <textarea value={briefDraft} onChange={e => setBriefDraft(e.target.value)} rows={5}
                style={{ padding: 10, borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13, resize: 'vertical', background: 'var(--color-surface)' }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={async () => { await saveField('brief', briefDraft); setEditingBrief(false) }} disabled={saving}
                  style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
                  {saving ? '...' : 'Sauvegarder'}
                </button>
                <button onClick={() => setEditingBrief(false)}
                  style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', fontSize: 12, cursor: 'pointer' }}>
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: campaign.brief ? 'inherit' : 'var(--color-muted-foreground)', whiteSpace: 'pre-wrap', margin: 0 }}>
              {campaign.brief || 'Aucun brief généré. Utilise le générateur →'}
            </p>
          )}
        </section>

        {/* Phases */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Phases</span>
            <button onClick={() => { setEditingPhases(true); setPhasesDraft(campaign.phases) }}
              style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-muted-foreground)' }}>
              Éditer
            </button>
          </div>
          {editingPhases ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <textarea value={phasesDraft} onChange={e => setPhasesDraft(e.target.value)} rows={3}
                style={{ padding: 10, borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13, resize: 'vertical', background: 'var(--color-surface)' }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={async () => { await saveField('phases', phasesDraft); setEditingPhases(false) }} disabled={saving}
                  style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
                  {saving ? '...' : 'Sauvegarder'}
                </button>
                <button onClick={() => setEditingPhases(false)}
                  style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', fontSize: 12, cursor: 'pointer' }}>
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: campaign.phases ? 'inherit' : 'var(--color-muted-foreground)', whiteSpace: 'pre-wrap', margin: 0 }}>
              {campaign.phases || 'Aucune phase définie.'}
            </p>
          )}
        </section>

        {/* Episodes */}
        <section>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            Épisodes ({campaign.episodesSlug.length})
          </div>
          {campaign.episodesSlug.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)' }}>Génère la campagne pour créer les épisodes.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {campaign.episodesSlug.map((slug, i) => (
                <div key={slug} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12 }}>
                  <span style={{ color: 'var(--color-muted-foreground)', minWidth: 24 }}>#{i + 1}</span>
                  <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 11 }}>{slug}</span>
                  <a href={`/?idea=${slug}`} style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: 11 }}>→ Backlog</a>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
