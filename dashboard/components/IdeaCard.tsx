'use client'
import { useState } from 'react'
import { useIdea } from '@/context/IdeaContext'
import type { Idea } from '@/lib/types'

const PILIER_COLORS: Record<string, string> = {
  'IA & Transformation':    '#2563EB',
  'Stratégie & Décision':   '#7c3aed',
  'Business & ROI':         '#059669',
  'Neurosciences & Adoption': '#D97706',
  'Innovation & Prospective': '#0891b2',
  'Coulisses & Authenticité': '#db2777',
}

const FORMAT_STYLES: Record<string, { bg: string; color: string }> = {
  'Post':      { bg: '#EFF6FF', color: '#2563EB' },
  'Carrousel': { bg: '#F5F3FF', color: '#7c3aed' },
  'Article':   { bg: '#ECFDF5', color: '#059669' },
  'Vidéo':     { bg: '#FEF2F2', color: '#DC2626' },
  'Newsletter':{ bg: '#FFF7ED', color: '#C2410C' },
}

const STATUT_LABEL: Record<Idea['statut'], string> = {
  raw: '○ Brute', draft: '✏ Draft', ready: '✓ Prête',
  scheduled: '📅 Planifiée', published: '📤 Publiée',
}

export function IdeaCard({ idea, onDelete }: { idea: Idea; onDelete?: (slug: string) => void }) {
  const { selectedIdea, setSelectedIdea, setDraggingSlug } = useIdea()
  const [hovered, setHovered] = useState(false)
  const isSelected = selectedIdea?.slug === idea.slug
  const dotColor = PILIER_COLORS[idea.pilier] ?? '#64748B'
  const fmt = FORMAT_STYLES[idea.format] ?? FORMAT_STYLES['Post']

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', idea.slug)
    setDraggingSlug(idea.slug)
  }
  const handleDragEnd = () => setDraggingSlug(null)

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => setSelectedIdea(isSelected ? null : idea)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: 'var(--color-surface)',
        border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
        boxShadow: isSelected ? '0 0 0 3px rgba(37,99,235,0.12)' : undefined,
        borderRadius: 'var(--radius-lg)',
        padding: '12px 14px',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {/* Delete button */}
      {onDelete && hovered && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(idea.slug) }}
          title="Supprimer"
          style={{
            position: 'absolute', top: 6, right: 6,
            width: 20, height: 20, borderRadius: '50%',
            background: 'var(--color-muted)', color: 'var(--color-muted-foreground)',
            border: 'none', cursor: 'pointer', fontSize: 11, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ✕
        </button>
      )}

      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0, marginTop: 5 }} />
        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-foreground)', lineHeight: 1.4, flex: 1 }}>
          {idea.sujet}
        </span>
      </div>

      {/* Preview */}
      {idea.texte && (
        <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', lineHeight: 1.5, marginBottom: 8,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {idea.hook || idea.texte}
        </p>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.04em', background: fmt.bg, color: fmt.color }}>
          {idea.format}
        </span>
        {idea.visuelType && (
          <span style={{ fontSize: 10, color: 'var(--color-muted-foreground)', background: 'var(--color-muted)',
            padding: '2px 6px', borderRadius: 4 }}>
            🖼 {idea.visuelType}
          </span>
        )}
        <span style={{ fontSize: 10, color: 'var(--color-muted-foreground)', marginLeft: 'auto' }}>
          {STATUT_LABEL[idea.statut]}
        </span>
      </div>
    </div>
  )
}
