'use client'
import type { VeilleItem } from '@/lib/types'

interface Props {
  items: VeilleItem[]
  loading: boolean
  onFetch: () => void
}

const URGENCE_COLOR: Record<string, string> = {
  haute: '#ef4444',
  moyenne: '#f59e0b',
  basse: 'var(--color-muted-foreground)',
}

export function VeillePanel({ items, loading, onFetch }: Props) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Veille IA — 5 sujets
        </div>
        <button
          onClick={onFetch}
          disabled={loading}
          style={{
            fontSize: 12, padding: '4px 10px', borderRadius: 4,
            background: 'var(--color-primary)', color: '#fff',
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Recherche...' : 'Rechercher'}
        </button>
      </div>

      {items.length === 0 && !loading && (
        <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)', padding: '12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6 }}>
          Lance la recherche pour obtenir les 5 sujets tendance de la semaine.
        </div>
      )}

      {items.map((item, i) => (
        <div key={i} style={{ padding: '10px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: URGENCE_COLOR[item.urgence], textTransform: 'uppercase', marginTop: 1, flexShrink: 0 }}>
              {item.urgence}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-foreground)', lineHeight: 1.4 }}>{item.titre}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)', marginBottom: 4 }}>{item.resume}</div>
          <div style={{ fontSize: 11, color: 'var(--color-primary)', fontStyle: 'italic' }}>{item.angleJonathan}</div>
          <div style={{ fontSize: 11, color: 'var(--color-muted-foreground)', marginTop: 4 }}>
            {item.pilier} · {item.source}
          </div>
        </div>
      ))}
    </div>
  )
}
