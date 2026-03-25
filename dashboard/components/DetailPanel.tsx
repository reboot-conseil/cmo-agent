'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useIdea } from '@/context/IdeaContext'
import type { Idea, Jour } from '@/lib/types'

const JOURS: Jour[] = ['Mar', 'Mer', 'Jeu']
const MAX_SEMAINES = 5

const PILIER_STYLES: Record<string, { bg: string; color: string }> = {
  'IA & Transformation':    { bg: '#EFF6FF', color: '#2563EB' },
  'Stratégie & Décision':   { bg: '#F5F3FF', color: '#7c3aed' },
  'Business & ROI':         { bg: '#ECFDF5', color: '#059669' },
  'Neurosciences & Adoption': { bg: '#FFFBEB', color: '#D97706' },
  'Innovation & Prospective': { bg: '#ECFEFF', color: '#0891b2' },
  'Coulisses & Authenticité': { bg: '#FDF2F8', color: '#db2777' },
}

export function DetailPanel({ allIdeas }: { allIdeas: Idea[] }) {
  const { selectedIdea: idea, setSelectedIdea } = useIdea()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [texte, setTexte] = useState('')
  const [generating, setGenerating] = useState(false)
  const [showDirection, setShowDirection] = useState(false)
  const [direction, setDirection] = useState('')

  if (!idea) {
    return (
      <div style={{ width: 380, minWidth: 380, background: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>✦</div>
          <p style={{ color: 'var(--color-muted-foreground)', fontSize: 13 }}>
            Sélectionne une idée pour voir les détails
          </p>
        </div>
      </div>
    )
  }

  const pStyle = PILIER_STYLES[idea.pilier] ?? { bg: '#F1F5F9', color: '#64748B' }

  const handlePlan = async (semaine: number, jour: Jour) => {
    await fetch(`/api/ideas/${idea.slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ semaine, jour, statut: 'scheduled' }),
    })
    router.refresh()
    setSelectedIdea(null)
  }

  const handleSaveTexte = async () => {
    await fetch(`/api/ideas/${idea.slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texte }),
    })
    setEditing(false)
    router.refresh()
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: idea.slug, sujet: idea.sujet, pilier: idea.pilier, format: idea.format, direction }),
      })
      setDirection('')
      setShowDirection(false)
      router.refresh()
    } finally {
      setGenerating(false)
    }
  }

  // Available slots (not occupied)
  const occupiedKeys = new Set(allIdeas.filter(i => i.semaine !== null && i.slug !== idea.slug).map(i => `${i.semaine}-${i.jour}`))
  const availableSlots = Array.from({ length: MAX_SEMAINES }, (_, i) => i + 1)
    .flatMap(s => JOURS.map(j => ({ semaine: s, jour: j })))
    .filter(({ semaine, jour }) => !occupiedKeys.has(`${semaine}-${jour}`))

  return (
    <div style={{ width: 380, minWidth: 380, background: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--color-border-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: pStyle.bg, color: pStyle.color }}>{idea.pilier}</span>
              <span style={{ padding: '3px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>{idea.format}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-foreground)', lineHeight: 1.4 }}>{idea.sujet}</div>
            {idea.hook && <div style={{ fontSize: 13, color: 'var(--color-primary)', fontStyle: 'italic', marginTop: 4 }}>{idea.hook}</div>}
          </div>
          <button onClick={() => setSelectedIdea(null)} style={{ padding: '4px 6px', background: 'transparent', border: 'none', color: 'var(--color-muted-foreground)', cursor: 'pointer', fontSize: 16, borderRadius: 4, flexShrink: 0 }}>✕</button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

        {/* Texte */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Texte du post</div>
          {editing ? (
            <div>
              <textarea value={texte} onChange={e => setTexte(e.target.value)} rows={8}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 13, lineHeight: 1.6, resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button onClick={handleSaveTexte} style={{ flex: 1, padding: '6px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 12, cursor: 'pointer' }}>Sauvegarder</button>
                <button onClick={() => setEditing(false)} style={{ padding: '6px 10px', background: 'var(--color-muted)', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 12, cursor: 'pointer' }}>Annuler</button>
              </div>
            </div>
          ) : idea.texte ? (
            <div style={{ background: 'var(--color-muted)', borderRadius: 'var(--radius-md)', padding: '12px 14px', fontSize: 13, color: 'var(--color-foreground)', lineHeight: 1.65 }}>
              {idea.texte.split('\n').map((p, i) => p.trim() && <p key={i} style={{ marginBottom: 8 }}>{p}</p>)}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--color-muted-foreground)', fontStyle: 'italic' }}>
              Pas encore de texte — cliquez sur "Générer" pour créer le contenu.
            </p>
          )}
        </div>

        {/* Visuel */}
        {(idea.visuelType || idea.visuelDescription) && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Visuel</div>
            <div style={{ background: 'var(--color-muted)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
              {idea.visuelType && <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>🖼 {idea.visuelType}</div>}
              {idea.visuelDescription && <div style={{ fontSize: 12, color: 'var(--color-foreground)', lineHeight: 1.6, fontStyle: 'italic' }}>{idea.visuelDescription}</div>}
            </div>
          </div>
        )}

        {/* Hashtags */}
        {idea.hashtags.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Hashtags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {idea.hashtags.map(h => (
                <span key={h} style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 500 }}>{h}</span>
              ))}
            </div>
          </div>
        )}

        {/* Planifier */}
        {idea.semaine === null && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Planifier</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {availableSlots.slice(0, 6).map(({ semaine, jour }) => (
                <div key={`${semaine}-${jour}`} onClick={() => handlePlan(semaine, jour)}
                  style={{ background: 'var(--color-muted)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}>
                  <div style={{ fontSize: 10, color: 'var(--color-muted-foreground)', marginBottom: 2 }}>SEM. {semaine}</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{jour}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Direction pour régénération */}
        {showDirection && (
          <div style={{ marginBottom: 12 }}>
            <textarea value={direction} onChange={e => setDirection(e.target.value)}
              placeholder="Direction optionnelle : angle plus personnel, insister sur le ROI, public dirigeants PME..."
              rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 12, resize: 'vertical' }} />
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border-muted)', display: 'flex', gap: 6 }}>
        <button onClick={() => { setEditing(true); setTexte(idea.texte) }}
          style={{ flex: 1, padding: '8px', background: 'var(--color-muted)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
          ✏️ Modifier
        </button>
        <button onClick={() => setShowDirection(v => !v)} disabled={generating}
          style={{ flex: 1, padding: '8px', background: 'var(--color-accent-light)', color: 'var(--color-accent)', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
          {generating ? '⏳ Génération...' : '✨ Générer'}
        </button>
        {showDirection && (
          <button onClick={handleGenerate} disabled={generating}
            style={{ padding: '8px 12px', background: 'var(--color-accent)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
            →
          </button>
        )}
      </div>
    </div>
  )
}
