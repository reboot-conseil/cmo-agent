'use client'
import type { WeeklyPlan, WeeklyPost } from '@/lib/types'

interface Props {
  plan: WeeklyPlan | null
  loading: boolean
  onGenerate: () => void
  onValidate: (post: WeeklyPost) => void
}

const TYPE_LABEL: Record<string, string> = {
  campagne: 'Campagne',
  reactif: 'Réactif',
  terrain: 'Terrain',
  evergreen: 'Evergreen',
}

const TYPE_COLOR: Record<string, string> = {
  campagne: 'var(--color-primary)',
  reactif: '#ef4444',
  terrain: '#10b981',
  evergreen: '#8b5cf6',
}

export function WeeklyPlanPanel({ plan, loading, onGenerate, onValidate }: Props) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-foreground)' }}>
          {plan ? `Plan — semaine ${plan.semaine}` : 'Plan de la semaine'}
        </div>
        <button
          onClick={onGenerate}
          disabled={loading}
          style={{
            fontSize: 13, padding: '6px 14px', borderRadius: 6,
            background: 'var(--color-primary)', color: '#fff',
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 600, opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Génération...' : plan ? 'Regénérer' : 'Générer le plan'}
        </button>
      </div>

      {!plan && !loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted-foreground)', fontSize: 13, textAlign: 'center', padding: 32 }}>
          Ajoute ta note de la semaine, lance la veille (optionnel),<br />puis génère le plan.
        </div>
      )}

      {plan && plan.posts.map((post, i) => (
        <div key={i} style={{
          padding: '14px 16px',
          background: 'var(--color-surface)',
          border: post.urgence === 'haute' ? '2px solid #ef4444' : '1px solid var(--color-border)',
          borderRadius: 8,
          marginBottom: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 3, background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
              {post.jour}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: TYPE_COLOR[post.type] }}>
              {TYPE_LABEL[post.type]}
            </span>
            {post.urgence === 'haute' && (
              <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>● URGENT</span>
            )}
            <span style={{ fontSize: 11, color: 'var(--color-muted-foreground)', marginLeft: 'auto' }}>
              {post.sourceLabel}
            </span>
          </div>

          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-foreground)', marginBottom: 4 }}>
            {post.sujet}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)', fontStyle: 'italic', marginBottom: 6, lineHeight: 1.5 }}>
            "{post.hook}"
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)', marginBottom: 10, lineHeight: 1.5 }}>
            {post.justification}
          </div>

          <button
            onClick={() => onValidate(post)}
            style={{
              fontSize: 12, padding: '4px 10px', borderRadius: 4,
              background: 'transparent', color: 'var(--color-primary)',
              border: '1px solid var(--color-primary)', cursor: 'pointer',
            }}
          >
            Valider → Calendrier
          </button>
        </div>
      ))}
    </div>
  )
}
