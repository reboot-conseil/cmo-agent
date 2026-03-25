'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useIdea } from '@/context/IdeaContext'
import type { Idea, Jour } from '@/lib/types'

const JOURS: Jour[] = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']
const MAX_SEMAINES = 5

const PILIER_COLORS: Record<string, string> = {
  'IA & Transformation':    '#2563EB',
  'Stratégie & Décision':   '#7c3aed',
  'Business & ROI':         '#059669',
  'Neurosciences & Adoption': '#D97706',
  'Innovation & Prospective': '#0891b2',
  'Coulisses & Authenticité': '#db2777',
}

const STATUT_BADGE: Record<Idea['statut'], { label: string; bg: string; color: string }> = {
  raw:       { label: '○ Brute',    bg: '#F1F5F9', color: '#64748B' },
  draft:     { label: '✏️ Draft',   bg: '#EFF6FF', color: '#2563EB' },
  ready:     { label: '✓ Prête',    bg: '#ECFDF5', color: '#059669' },
  scheduled: { label: '⬜ À créer', bg: '#F1F5F9', color: '#64748B' },
  published: { label: '📤 Publié',  bg: '#F5F3FF', color: '#7c3aed' },
}

export function CalendarGrid({ ideas }: { ideas: Idea[] }) {
  const router = useRouter()
  const { setSelectedIdea, draggingSlug, setDraggingSlug } = useIdea()
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null)

  const scheduledIdeas = ideas.filter(i => i.semaine !== null)
  const kpi = {
    planifiés: ideas.filter(i => ['scheduled', 'draft', 'ready'].includes(i.statut) && i.semaine !== null).length,
    aValider:  ideas.filter(i => i.statut === 'ready').length,
    publiés:   ideas.filter(i => i.statut === 'published').length,
  }

  function getIdea(semaine: number, jour: Jour): Idea | null {
    return scheduledIdeas.find(i => i.semaine === semaine && i.jour === jour) ?? null
  }

  async function handleDrop(e: React.DragEvent, semaine: number, jour: Jour) {
    e.preventDefault()
    setDragOverSlot(null)
    const slug = e.dataTransfer.getData('text/plain')
    if (!slug) return
    await fetch(`/api/ideas/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ semaine, jour, statut: 'scheduled' }),
    })
    router.refresh()
  }

  const slotKey = (s: number, j: Jour) => `${s}-${j}`

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header with KPIs */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--color-border-muted)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Calendrier</span>
        <div style={{ display: 'flex', gap: 16, marginLeft: 'auto' }}>
          {[
            { label: 'Planifiés', val: kpi.planifiés, color: 'var(--color-primary)' },
            { label: 'À valider', val: kpi.aValider, color: 'var(--color-warning)' },
            { label: 'Publiés',   val: kpi.publiés,  color: 'var(--color-success)' },
          ].map(k => (
            <div key={k.label} style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: k.color, lineHeight: 1 }}>{k.val}</div>
              <div style={{ fontSize: 10, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {/* Day headers */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, paddingLeft: 72 }}>
          {JOURS.map(j => (
            <div key={j} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{j}</div>
          ))}
        </div>

        {Array.from({ length: MAX_SEMAINES }, (_, i) => i + 1).map(semaine => (
          <div key={semaine} style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-start' }}>
            {/* Week label */}
            <div style={{ width: 64, minWidth: 64, paddingTop: 10, fontSize: 11, fontWeight: 600, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Sem. {semaine}
            </div>
            {/* Day slots */}
            {JOURS.map(jour => {
              const idea = getIdea(semaine, jour)
              const key = slotKey(semaine, jour)
              const isDragOver = dragOverSlot === key
              const pilierColor = idea ? (PILIER_COLORS[idea.pilier] ?? '#64748B') : undefined
              const badge = idea ? STATUT_BADGE[idea.statut] : null

              return (
                <div key={jour} style={{ flex: 1 }}
                  onDragOver={e => { e.preventDefault(); setDragOverSlot(key) }}
                  onDragLeave={() => setDragOverSlot(null)}
                  onDrop={e => handleDrop(e, semaine, jour)}>
                  <div
                    draggable={!!idea}
                    onDragStart={idea ? (e) => { e.dataTransfer.setData('text/plain', idea.slug); setDraggingSlug(idea.slug) } : undefined}
                    onDragEnd={idea ? () => setDraggingSlug(null) : undefined}
                    onClick={() => idea && setSelectedIdea(idea)}
                    style={{
                      minHeight: 80, borderRadius: 'var(--radius-md)', padding: 8,
                      border: `1.5px ${idea ? 'solid' : 'dashed'} ${isDragOver ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: isDragOver ? 'var(--color-primary-light)' : 'var(--color-surface)',
                      cursor: idea ? 'grab' : 'default',
                      display: 'flex', flexDirection: 'column',
                      alignItems: idea ? 'flex-start' : 'center',
                      justifyContent: idea ? 'flex-start' : 'center',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}>
                    {idea ? (
                      <>
                        <div style={{ height: 3, width: '100%', background: pilierColor, borderRadius: 2, marginBottom: 6 }} />
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-foreground)', lineHeight: 1.35, marginBottom: 4 }}>
                          {idea.sujet.length > 50 ? idea.sujet.slice(0, 50) + '…' : idea.sujet}
                        </div>
                        {badge && (
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 500, background: badge.bg, color: badge.color }}>
                            {badge.label}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: 18, opacity: 0.25, marginBottom: 2 }}>＋</span>
                        <span style={{ fontSize: 10, opacity: 0.5 }}>Déposer</span>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
