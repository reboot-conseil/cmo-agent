'use client'
import { useState } from 'react'

export function QuickPostPanel() {
  const [sujet, setSujet] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit() {
    if (!sujet.trim() || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/cette-semaine/quick-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sujet }),
      })
      if (!res.ok) throw new Error(await res.text())
      setSujet('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e) {
      console.error('Quick post error:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontSize: 12, fontWeight: 600, color: 'var(--color-muted-foreground)',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
      }}>
        Idée one-shot
      </div>
      <textarea
        value={sujet}
        onChange={e => setSujet(e.target.value)}
        placeholder="Un sujet précis → Claude génère le hook et l'ajoute au backlog"
        rows={3}
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
          marginBottom: 8,
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={!sujet.trim() || loading}
        style={{
          width: '100%',
          fontSize: 13, padding: '7px 14px', borderRadius: 6,
          background: 'var(--color-primary)', color: '#fff',
          border: 'none', cursor: (!sujet.trim() || loading) ? 'not-allowed' : 'pointer',
          fontWeight: 600, opacity: (!sujet.trim() || loading) ? 0.5 : 1,
        }}
      >
        {loading ? 'Génération...' : 'Générer → Backlog'}
      </button>
      {success && (
        <div style={{
          marginTop: 8, fontSize: 12, color: '#10b981',
          fontWeight: 600, textAlign: 'center',
        }}>
          Ajouté au backlog
        </div>
      )}
    </div>
  )
}
