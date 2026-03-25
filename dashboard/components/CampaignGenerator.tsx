'use client'
import { useState, useEffect } from 'react'
import type { Campaign } from '@/lib/types'
import { useCampaigns } from '@/context/CampaignContext'

export function CampaignGenerator() {
  const { campaigns, setCampaigns, selectedSlug } = useCampaigns()
  const campaign = campaigns.find(c => c.slug === selectedSlug) ?? null

  const [audience, setAudience] = useState('')
  const [contraintes, setContraintes] = useState('')
  const [ton, setTon] = useState('')
  const [evenements, setEvenements] = useState('')
  const [objectif, setObjectif] = useState(campaign?.objectif ?? '')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset all fields when the selected campaign changes
  useEffect(() => {
    setObjectif(campaign?.objectif ?? '')
    setAudience('')
    setContraintes('')
    setTon('')
    setEvenements('')
    setError(null)
  }, [selectedSlug])

  if (!campaign) return null

  function buildContexte(): string {
    const parts = [
      audience ? `Audience : ${audience}` : '',
      contraintes ? `Contraintes : ${contraintes}` : '',
      ton ? `Ton : ${ton}` : '',
      evenements ? `Événements à éviter : ${evenements}` : '',
    ].filter(Boolean)
    return parts.join('\n')
  }

  async function handleGenerate() {
    if (!campaign) return
    setGenerating(true)
    setError(null)
    try {
      const contexte = buildContexte()
      const res = await fetch('/api/campagnes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: campaign.slug,
          titre: campaign.titre,
          format: campaign.format,
          duree: campaign.duree,
          objectif: objectif || campaign.objectif,
          contexte,
        }),
      })
      if (!res.ok) {
        const { error: msg } = await res.json()
        throw new Error(msg)
      }
      const updated: Campaign = await res.json()
      setCampaigns(campaigns.map(c => c.slug === updated.slug ? updated : c))
    } catch (e) {
      setError(String(e))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div style={{ width: 360, minWidth: 360, borderLeft: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', padding: 20, gap: 14, overflowY: 'auto' }}>
      <div style={{ fontWeight: 600, fontSize: 14 }}>Générateur</div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>Objectif de la campagne</span>
        <input value={objectif} onChange={e => setObjectif(e.target.value)} placeholder="ex : Positionnement expert + notoriété"
          style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13, background: 'var(--color-surface)' }} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>Audience cible</span>
        <input value={audience} onChange={e => setAudience(e.target.value)} placeholder="ex : dirigeants PME Alsace, secteurs industrie et santé"
          style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13, background: 'var(--color-surface)' }} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>Contraintes</span>
        <input value={contraintes} onChange={e => setContraintes(e.target.value)} placeholder="ex : max 1 vidéo/semaine"
          style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13, background: 'var(--color-surface)' }} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>Ton souhaité</span>
        <input value={ton} onChange={e => setTon(e.target.value)} placeholder="ex : direct et pédagogue, avec humour"
          style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13, background: 'var(--color-surface)' }} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>Événements / thèmes à éviter</span>
        <input value={evenements} onChange={e => setEvenements(e.target.value)} placeholder="ex : élections, sujets politiques"
          style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13, background: 'var(--color-surface)' }} />
      </label>

      {error && (
        <div style={{ fontSize: 12, color: '#e53935', padding: '8px 10px', borderRadius: 6, background: '#fdecea' }}>
          {error}
        </div>
      )}

      <button onClick={handleGenerate} disabled={generating}
        style={{ padding: '10px 0', borderRadius: 8, border: 'none', background: generating ? 'var(--color-border)' : 'var(--color-primary)', color: generating ? 'var(--color-muted-foreground)' : '#fff', fontSize: 14, fontWeight: 600, cursor: generating ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
        {generating ? 'Génération en cours...' : 'Générer la stratégie + tous les épisodes'}
      </button>

      {!generating && campaign.episodesSlug.length > 0 && (
        <a href="/" style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-primary)', textDecoration: 'none' }}>
          → Voir dans le backlog
        </a>
      )}

      <div style={{ fontSize: 11, color: 'var(--color-muted-foreground)', lineHeight: 1.5 }}>
        La génération prend 15-30 secondes. Les épisodes déjà publiés ne seront pas écrasés.
      </div>
    </div>
  )
}
