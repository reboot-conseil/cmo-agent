'use client'

interface Props {
  value: string
  onChange: (v: string) => void
}

export function NoteVocalePanel({ value, onChange }: Props) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Ta note de la semaine
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Dicte sur ton téléphone, colle le texte ici. Ce qui s'est passé cette semaine : un client marquant, un insight terrain, une résistance observée, une victoire rapide..."
        rows={6}
        style={{
          width: '100%',
          padding: '10px 12px',
          fontSize: 13,
          lineHeight: 1.6,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 6,
          color: 'var(--color-foreground)',
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}
