'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STEPS = [
  { label: 'Identité' },
  { label: 'Parcours' },
  { label: 'Mission & Convictions' },
  { label: 'Audience' },
  { label: 'Voix & Style' },
]

type FormData = {
  nom: string; poste: string; entreprise: string; secteur: string
  experiences: string; differentiation: string
  mission: string; convictions: string
  cible: string; douleur: string; attente: string
  registre: string; antipatterns: string; exemple_formulation: string
}

const EMPTY: FormData = {
  nom: '', poste: '', entreprise: '', secteur: '',
  experiences: '', differentiation: '',
  mission: '', convictions: '',
  cible: '', douleur: '', attente: '',
  registre: 'visionnaire-pedagogue', antipatterns: '', exemple_formulation: '',
}

const inp: React.CSSProperties = {
  width: '100%', border: '1px solid #e2e8f0', borderRadius: 8,
  padding: '10px 12px', fontSize: 14, outline: 'none',
  background: '#fff', color: '#1a202c', boxSizing: 'border-box',
}
const ta: React.CSSProperties = { ...inp, resize: 'vertical', minHeight: 100 }
const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }
const hint: React.CSSProperties = { fontSize: 12, color: '#a0aec0', marginTop: 4 }

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(key: keyof FormData, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function canAdvance() {
    if (step === 0) return form.nom.trim() && form.poste.trim()
    if (step === 1) return form.experiences.trim()
    if (step === 2) return form.mission.trim() && form.convictions.trim()
    if (step === 3) return form.cible.trim() && form.douleur.trim()
    return true
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Erreur lors de la génération')
      router.push('/calendrier')
    } catch (e) {
      setError(String(e))
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 580, background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: '40px 48px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', letterSpacing: 1, marginBottom: 8 }}>✦ CMO AGENT — CONFIGURATION INITIALE</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a202c', margin: '0 0 6px' }}>Définissons votre stratégie éditoriale</h1>
          <p style={{ fontSize: 14, color: '#718096', margin: 0 }}>Claude va générer votre identité de marque complète à partir de vos réponses.</p>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', height: 4, borderRadius: 2, background: i <= step ? '#6366f1' : '#e2e8f0', transition: 'background 0.3s' }} />
              <span style={{ fontSize: 10, color: i <= step ? '#6366f1' : '#a0aec0', fontWeight: 600 }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 32 }}>

          {step === 0 && <>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#2d3748', margin: 0 }}>Qui êtes-vous ?</h2>
            <div><label style={lbl}>Prénom &amp; Nom *</label><input style={inp} value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="ex : Jonathan Braun" /></div>
            <div><label style={lbl}>Poste actuel *</label><input style={inp} value={form.poste} onChange={e => set('poste', e.target.value)} placeholder="ex : Responsable Stratégie & IA" /></div>
            <div><label style={lbl}>Entreprise</label><input style={inp} value={form.entreprise} onChange={e => set('entreprise', e.target.value)} placeholder="ex : Reboot Conseil" /></div>
            <div><label style={lbl}>Secteur d&apos;activité</label><input style={inp} value={form.secteur} onChange={e => set('secteur', e.target.value)} placeholder="ex : Conseil en transformation IA, PME/ETI" /></div>
          </>}

          {step === 1 && <>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#2d3748', margin: 0 }}>Votre parcours</h2>
            <div>
              <label style={lbl}>Vos 2-3 expériences professionnelles les plus marquantes *</label>
              <textarea style={ta} value={form.experiences} onChange={e => set('experiences', e.target.value)}
                placeholder="ex : Président d'une ONG internationale (800k étudiants, 50 pays), stages stratégiques chez Merck Healthcare, Business Manager en ingénierie industrielle..." />
              <p style={hint}>Ces expériences deviendront la matière narrative de vos posts.</p>
            </div>
            <div>
              <label style={lbl}>Ce qui vous rend unique</label>
              <textarea style={{ ...ta, minHeight: 80 }} value={form.differentiation} onChange={e => set('differentiation', e.target.value)}
                placeholder="Ce que peu de gens dans votre domaine ont vécu ou savent faire. Votre combinaison originale de compétences." />
            </div>
          </>}

          {step === 2 && <>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#2d3748', margin: 0 }}>Mission &amp; Convictions</h2>
            <div>
              <label style={lbl}>Votre mission éditoriale en une phrase *</label>
              <input style={inp} value={form.mission} onChange={e => set('mission', e.target.value)}
                placeholder="ex : Je mets l'IA au service des rêves humains et de la transformation organisationnelle." />
              <p style={hint}>Le fil rouge de tout votre contenu.</p>
            </div>
            <div>
              <label style={lbl}>Vos 2-3 convictions fortes *</label>
              <textarea style={{ ...ta, minHeight: 120 }} value={form.convictions} onChange={e => set('convictions', e.target.value)}
                placeholder={"Thèses que vous affirmeriez même si ça dérange.\nex :\n- La plupart des projets IA échouent par manque de stratégie, pas de technologie.\n- L'IA ne va pas remplacer les jobs, elle va redéfinir les compétences."} />
            </div>
          </>}

          {step === 3 && <>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#2d3748', margin: 0 }}>Votre audience cible</h2>
            <div><label style={lbl}>Cible principale *</label><input style={inp} value={form.cible} onChange={e => set('cible', e.target.value)} placeholder="ex : Dirigeants et cadres (CEO, DG, DAF, DRH) de PME/ETI françaises" /></div>
            <div>
              <label style={lbl}>Leur problème principal *</label>
              <textarea style={{ ...ta, minHeight: 80 }} value={form.douleur} onChange={e => set('douleur', e.target.value)}
                placeholder="ex : Ils savent qu'ils doivent agir sur l'IA mais ne savent pas par où commencer, ni à qui faire confiance." />
            </div>
            <div><label style={lbl}>Ce qu&apos;ils cherchent en vous suivant</label><input style={inp} value={form.attente} onChange={e => set('attente', e.target.value)} placeholder="ex : Clarté, pragmatisme, exemples concrets — un guide qui parle leur langue business" /></div>
          </>}

          {step === 4 && <>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#2d3748', margin: 0 }}>Voix &amp; Style</h2>
            <div>
              <label style={lbl}>Registre principal</label>
              <select style={inp} value={form.registre} onChange={e => set('registre', e.target.value)}>
                <option value="visionnaire-pedagogue">Visionnaire + Pédagogue</option>
                <option value="praticien-authentique">Praticien + Authentique</option>
                <option value="expert-strategique">Expert Stratégique</option>
                <option value="vulgarisateur">Vulgarisateur & Accessible</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Ce que vous ne voulez jamais dire ou faire</label>
              <textarea style={{ ...ta, minHeight: 80 }} value={form.antipatterns} onChange={e => set('antipatterns', e.target.value)}
                placeholder={"ex : Pas de jargon creux (disruption, synergie), pas de sensationnalisme, pas d'emojis à chaque ligne, pas de 'Et vous, qu'en pensez-vous ?'"} />
            </div>
            <div>
              <label style={lbl}>Un exemple de formulation qui vous ressemble</label>
              <textarea style={{ ...ta, minHeight: 80 }} value={form.exemple_formulation} onChange={e => set('exemple_formulation', e.target.value)}
                placeholder="Une phrase ou un extrait d'un texte que vous avez écrit et qui capture bien votre voix." />
            </div>
          </>}
        </div>

        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#c53030', marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
            style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#4a5568', fontSize: 14, fontWeight: 600, cursor: step === 0 ? 'not-allowed' : 'pointer', opacity: step === 0 ? 0.4 : 1 }}>
            ← Précédent
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}
              style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: canAdvance() ? '#6366f1' : '#e2e8f0', color: canAdvance() ? '#fff' : '#a0aec0', fontSize: 14, fontWeight: 600, cursor: canAdvance() ? 'pointer' : 'not-allowed' }}>
              Suivant →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading}
              style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: loading ? '#e2e8f0' : '#6366f1', color: loading ? '#a0aec0' : '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Claude génère votre stratégie...' : 'Générer ma stratégie ✦'}
            </button>
          )}
        </div>

        <p style={{ fontSize: 11, color: '#cbd5e0', textAlign: 'center', marginTop: 20 }}>Étape {step + 1} / {STEPS.length}</p>
      </div>
    </div>
  )
}
