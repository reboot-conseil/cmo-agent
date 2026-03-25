'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router = useRouter()
  const [form, setForm] = useState({ nom: '', poste: '', entreprise: '', mission: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    router.push('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Bienvenue — configurons votre profil</h1>

        {[
          { key: 'nom', label: 'Votre prénom et nom', required: true },
          { key: 'poste', label: 'Votre poste', required: true },
          { key: 'entreprise', label: 'Votre entreprise', required: false },
          { key: 'mission', label: 'Votre mission éditoriale (en une phrase)', required: false },
        ].map(({ key, label, required }) => (
          <div key={key}>
            <label className="block text-sm font-medium mb-1">{label}</label>
            <input
              type="text"
              required={required}
              value={form[key as keyof typeof form]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        ))}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white rounded px-4 py-2 disabled:opacity-50"
        >
          {loading ? 'Création...' : 'Commencer'}
        </button>
      </form>
    </div>
  )
}
