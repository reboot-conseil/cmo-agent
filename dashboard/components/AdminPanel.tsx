'use client'

import { useState } from 'react'

interface UsageSummary {
  month: string
  tokensUsed: number
  requestCount: number
  limit: number
}

interface UserUsageSummary {
  userId: string
  tokensUsed: number
  requestCount: number
  limit: number
}

export function AdminPanel({
  history,
  allUsersUsage,
}: {
  history: UsageSummary[]
  allUsersUsage: UserUsageSummary[]
}) {
  const current = history[0]
  const [limit, setLimit] = useState(String(current?.limit ?? 50000))
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const pct = current ? Math.round((current.tokensUsed / current.limit) * 100) : 0

  async function handleSetLimit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    const res = await fetch('/api/admin/set-limit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthlyTokenLimit: Number(limit) }),
    })
    setSaving(false)
    setMsg(res.ok ? 'Limite mise à jour.' : 'Erreur.')
  }

  return (
    <div style={{ maxWidth: 720, margin: '48px auto', padding: '0 24px', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 32 }}>Admin — Usage</h1>

      {current && (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, marginBottom: 32 }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Mois courant — {current.month}</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{current.tokensUsed.toLocaleString('fr')} tokens</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            {pct}% de la limite ({current.limit.toLocaleString('fr')}) · {current.requestCount} requêtes
          </div>
          <div style={{ marginTop: 12, height: 8, background: '#e5e7eb', borderRadius: 4 }}>
            <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: pct > 90 ? '#ef4444' : '#3b82f6', borderRadius: 4 }} />
          </div>
        </div>
      )}

      <form onSubmit={handleSetLimit} style={{ marginBottom: 40, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Limite mensuelle (tokens)</label>
          <input
            type="number"
            value={limit}
            onChange={e => setLimit(e.target.value)}
            min={1000}
            style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 12px', fontSize: 14, width: 160 }}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          style={{ padding: '8px 20px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? '…' : 'Enregistrer'}
        </button>
        {msg && <span style={{ fontSize: 13, color: '#6b7280' }}>{msg}</span>}
      </form>

      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Historique (6 mois)</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 40 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left', color: '#6b7280' }}>
            <th style={{ padding: '8px 12px' }}>Mois</th>
            <th style={{ padding: '8px 12px' }}>Tokens</th>
            <th style={{ padding: '8px 12px' }}>Requêtes</th>
            <th style={{ padding: '8px 12px' }}>% limite</th>
          </tr>
        </thead>
        <tbody>
          {history.map(row => (
            <tr key={row.month} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '8px 12px' }}>{row.month}</td>
              <td style={{ padding: '8px 12px' }}>{row.tokensUsed.toLocaleString('fr')}</td>
              <td style={{ padding: '8px 12px' }}>{row.requestCount}</td>
              <td style={{ padding: '8px 12px' }}>{Math.round((row.tokensUsed / row.limit) * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Utilisateurs — mois courant</h2>
      {allUsersUsage.length === 0 ? (
        <p style={{ fontSize: 13, color: '#6b7280' }}>Aucun utilisateur ce mois.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left', color: '#6b7280' }}>
              <th style={{ padding: '8px 12px' }}>Utilisateur</th>
              <th style={{ padding: '8px 12px' }}>Tokens</th>
              <th style={{ padding: '8px 12px' }}>Requêtes</th>
              <th style={{ padding: '8px 12px' }}>% limite</th>
            </tr>
          </thead>
          <tbody>
            {allUsersUsage.map(row => (
              <tr key={row.userId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12 }}>
                  {row.userId.slice(0, 14)}…
                </td>
                <td style={{ padding: '8px 12px' }}>{row.tokensUsed.toLocaleString('fr')}</td>
                <td style={{ padding: '8px 12px' }}>{row.requestCount}</td>
                <td style={{ padding: '8px 12px' }}>{Math.round((row.tokensUsed / row.limit) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
