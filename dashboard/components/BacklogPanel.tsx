'use client'
import { useState } from 'react'
import { useIdea } from '@/context/IdeaContext'
import { IdeaCard } from './IdeaCard'
import type { Format } from '@/lib/types'

const FORMATS: Format[] = ['Post', 'Carrousel', 'Article', 'Vidéo', 'Newsletter']
const SECTIONS: { key: string; label: string; types: Format[] }[] = [
  { key: 'posts', label: 'Posts terrain', types: ['Post'] },
  { key: 'carousels', label: 'Carrousels', types: ['Carrousel'] },
  { key: 'articles', label: 'Articles', types: ['Article'] },
  { key: 'videos', label: 'Vidéos', types: ['Vidéo', 'Newsletter'] },
]

export function BacklogPanel() {
  const { ideas, addIdea, removeIdea, returnToBacklog, draggingSlug } = useIdea()
  const [filter, setFilter] = useState<Format | 'Tous'>('Tous')
  const [adding, setAdding] = useState(false)
  const [newIdea, setNewIdea] = useState({ sujet: '', pilier: 'IA & Transformation', format: 'Post' as Format })
  const [isDragOver, setIsDragOver] = useState(false)

  const unscheduled = ideas.filter(i => i.semaine === null && i.statut !== 'published')
  const filtered = filter === 'Tous' ? unscheduled : unscheduled.filter(i => i.format === filter)

  // Only show drop zone when dragging a scheduled idea
  const draggingScheduled = draggingSlug != null && ideas.find(i => i.slug === draggingSlug)?.semaine != null

  const handleDelete = async (slug: string) => {
    removeIdea(slug)
    await fetch(`/api/ideas/${slug}`, { method: 'DELETE' })
  }

  const handleAdd = async () => {
    if (!newIdea.sujet.trim()) return
    const resp = await fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newIdea),
    })
    if (resp.ok) {
      const created = await resp.json()
      addIdea(created)
    }
    setNewIdea({ sujet: '', pilier: 'IA & Transformation', format: 'Post' })
    setAdding(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const slug = e.dataTransfer.getData('text/plain')
    if (!slug) return
    await returnToBacklog(slug)
  }

  return (
    <div style={{ width: 340, minWidth: 340, background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 10px', borderBottom: '1px solid var(--color-border-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Idées</span>
        <span style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)', fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 99 }}>{unscheduled.length}</span>
        <button onClick={() => setAdding(v => !v)} style={{ marginLeft: 'auto', padding: '4px 10px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
          {adding ? '✕' : '+ Ajouter'}
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border-muted)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input value={newIdea.sujet} onChange={e => setNewIdea(v => ({ ...v, sujet: e.target.value }))}
            placeholder="Idée brute..." style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 13 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <select value={newIdea.pilier} onChange={e => setNewIdea(v => ({ ...v, pilier: e.target.value }))}
              style={{ flex: 1, padding: '5px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 12 }}>
              {['IA & Transformation','Stratégie & Décision','Business & ROI','Neurosciences & Adoption','Innovation & Prospective','Coulisses & Authenticité'].map(p => <option key={p}>{p}</option>)}
            </select>
            <select value={newIdea.format} onChange={e => setNewIdea(v => ({ ...v, format: e.target.value as Format }))}
              style={{ width: 90, padding: '5px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 12 }}>
              {FORMATS.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <button onClick={handleAdd} style={{ padding: '6px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 12, cursor: 'pointer' }}>Créer l'idée</button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', padding: '8px 16px', gap: 4, borderBottom: '1px solid var(--color-border-muted)', flexWrap: 'wrap' }}>
        {(['Tous', ...FORMATS] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
              background: filter === f ? 'var(--color-primary-light)' : 'transparent',
              color: filter === f ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }}>
            {f}
          </button>
        ))}
      </div>

      {/* Drop zone banner — only visible when dragging a scheduled idea */}
      {draggingScheduled && (
        <div
          onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          style={{
            margin: '8px 12px 0',
            padding: '10px',
            borderRadius: 'var(--radius-md)',
            border: `2px dashed ${isDragOver ? 'var(--color-primary)' : 'var(--color-border)'}`,
            background: isDragOver ? 'var(--color-primary-light)' : 'transparent',
            textAlign: 'center',
            fontSize: 12,
            color: isDragOver ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
            transition: 'border-color 0.15s, background 0.15s',
          }}>
          Déposer ici pour retirer du calendrier
        </div>
      )}

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 && (
          <p style={{ color: 'var(--color-muted-foreground)', fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginTop: 24 }}>
            Aucune idée dans cette catégorie.
          </p>
        )}
        {(filter === 'Tous' ? SECTIONS : [{ key: 'filtered', label: filter, types: [filter as Format] }]).map(section => {
          const sectionIdeas = filtered.filter(i => section.types.includes(i.format))
          if (sectionIdeas.length === 0) return null
          return (
            <div key={section.key}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 2px', marginBottom: 4 }}>
                {section.label}
              </div>
              {sectionIdeas.map(idea => <IdeaCard key={idea.slug} idea={idea} onDelete={handleDelete} />)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
