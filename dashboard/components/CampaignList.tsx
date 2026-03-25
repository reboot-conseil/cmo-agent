'use client'
import { useState } from 'react'
import type { Campaign, CampaignStatus, Format } from '@/lib/types'
import { useCampaigns } from '@/context/CampaignContext'

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  completed: 'Terminée',
}

const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: '#888',
  active: 'var(--color-primary)',
  completed: '#4caf50',
}

const FORMATS: Array<Format | 'Mix'> = ['Post', 'Carrousel', 'Article', 'Vidéo', 'Newsletter', 'Mix']

export function CampaignList() {
  const { campaigns, setCampaigns, selectedSlug, setSelectedSlug } = useCampaigns()
  const [filter, setFilter] = useState<CampaignStatus | 'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [newTitre, setNewTitre] = useState('')
  const [newFormat, setNewFormat] = useState<Format | 'Mix'>('Post')
  const [newDuree, setNewDuree] = useState(3)
  const [creating, setCreating] = useState(false)

  const visible = filter === 'all' ? campaigns : campaigns.filter(c => c.statut === filter)

  async function handleCreate() {
    if (!newTitre.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/campagnes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titre: newTitre, format: newFormat, duree: newDuree }),
      })
      const created: Campaign = await res.json()
      setCampaigns([created, ...campaigns])
      setSelectedSlug(created.slug)
      setShowForm(false)
      setNewTitre('')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{ width: 280, minWidth: 280, borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Campagnes</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(['all', 'draft', 'active', 'completed'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, border: '1px solid var(--color-border)', background: filter === s ? 'var(--color-primary)' : 'transparent', color: filter === s ? '#fff' : 'var(--color-muted-foreground)', cursor: 'pointer' }}>
              {s === 'all' ? 'Toutes' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {visible.map(c => {
          const total = c.episodesSlug.length
          // Note: idea statuses not available in Campaign object — showing episode count only (YAGNI)
          const pct = total > 0 ? 100 : 0
          return (
            <div key={c.slug} onClick={() => setSelectedSlug(c.slug)}
              style={{ padding: '10px 12px', marginBottom: 6, borderRadius: 8, cursor: 'pointer', border: `1px solid ${selectedSlug === c.slug ? 'var(--color-primary)' : 'var(--color-border)'}`, background: selectedSlug === c.slug ? 'var(--color-primary-light)' : 'var(--color-surface)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{c.titre}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 10, background: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}>{c.format}</span>
                <span style={{ fontSize: 11, color: STATUS_COLORS[c.statut] }}>{STATUS_LABELS[c.statut]}</span>
                <span style={{ fontSize: 11, color: 'var(--color-muted-foreground)', marginLeft: 'auto' }}>{c.duree} mois</span>
              </div>
              <div style={{ height: 3, borderRadius: 2, background: 'var(--color-border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-primary)', borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--color-muted-foreground)', marginTop: 3 }}>{total} épisodes</div>
            </div>
          )
        })}
        {visible.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--color-muted-foreground)', fontSize: 13, padding: 24 }}>
            Aucune campagne
          </div>
        )}
      </div>

      {/* New campaign form */}
      <div style={{ borderTop: '1px solid var(--color-border)', padding: 12 }}>
        {!showForm ? (
          <button onClick={() => setShowForm(true)}
            style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: '1px dashed var(--color-border)', background: 'transparent', color: 'var(--color-primary)', cursor: 'pointer', fontSize: 13 }}>
            + Nouvelle campagne
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input value={newTitre} onChange={e => setNewTitre(e.target.value)} placeholder="Titre de la campagne"
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13, background: 'var(--color-surface)' }} />
            <select value={newFormat} onChange={e => setNewFormat(e.target.value as Format | 'Mix')}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13, background: 'var(--color-surface)' }}>
              {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <select value={newDuree} onChange={e => setNewDuree(Number(e.target.value))}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13, background: 'var(--color-surface)' }}>
              {[1, 2, 3, 6].map(d => <option key={d} value={d}>{d} mois</option>)}
            </select>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleCreate} disabled={creating || !newTitre.trim()}
                style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: 13, cursor: 'pointer', opacity: creating ? 0.6 : 1 }}>
                {creating ? '...' : 'Créer'}
              </button>
              <button onClick={() => setShowForm(false)}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', fontSize: 13, cursor: 'pointer' }}>
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
