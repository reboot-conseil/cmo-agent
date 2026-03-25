'use client'

import { useState } from 'react'
import type { VisionData, VisionResponse } from '@/lib/types'

type Props = {
  initialData: VisionData
}

export function StrategyMemory({ initialData }: Props) {
  const [vision, setVision] = useState<VisionData>(initialData)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noteValue, setNoteValue] = useState(initialData.noteJonathan)
  const [noteChanged, setNoteChanged] = useState(false)

  async function handleGenerate() {
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/strategy/generate-vision', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        throw new Error(body.error ?? 'Erreur serveur')
      }
      const data = await res.json() as VisionData
      setVision(data)
      setNoteValue(data.noteJonathan)
      setNoteChanged(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleSaveNote() {
    setIsSavingNote(true)
    setError(null)
    try {
      const res = await fetch('/api/strategy/save-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteValue }),
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        throw new Error(body.error ?? 'Erreur serveur')
      }
      setNoteChanged(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsSavingNote(false)
    }
  }

  const v = vision.visionIA

  return (
    <div style={{ marginBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
            Vision stratégique
          </h2>
          {vision.generatedAt && (
            <p style={{ fontSize: '12px', color: '#999', margin: '4px 0 0' }}>
              Générée le {vision.generatedAt}
            </p>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          style={{
            padding: '8px 16px',
            background: isGenerating ? '#6c757d' : '#0d6efd',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: isGenerating ? 'not-allowed' : 'pointer',
          }}
        >
          {isGenerating ? 'Génération en cours...' : v ? 'Régénérer la vision' : 'Générer la vision'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', color: '#856404' }}>
          {error}
        </div>
      )}

      {!v ? (
        <div style={{ padding: '40px', textAlign: 'center', background: '#f8f9fa', borderRadius: '8px', border: '1px dashed #dee2e6', color: '#6c757d' }}>
          <p style={{ margin: 0, fontSize: '14px' }}>Aucune vision générée — cliquez sur &ldquo;Générer la vision&rdquo; pour commencer.</p>
        </div>
      ) : (
        <VisionDisplay vision={v} />
      )}

      {/* Note Jonathan */}
      <div style={{ marginTop: '24px', padding: '20px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
          Note / contexte Jonathan
        </h3>
        <textarea
          value={noteValue}
          onChange={(e) => {
            setNoteValue(e.target.value)
            setNoteChanged(e.target.value !== vision.noteJonathan)
          }}
          placeholder="Ajouter un contexte, une priorité, un cap pour guider la prochaine génération..."
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '12px',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
        {noteChanged && (
          <button
            onClick={handleSaveNote}
            disabled={isSavingNote}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              background: isSavingNote ? '#6c757d' : '#198754',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: isSavingNote ? 'not-allowed' : 'pointer',
            }}
          >
            {isSavingNote ? 'Sauvegarde...' : 'Sauvegarder la note'}
          </button>
        )}
      </div>
    </div>
  )
}

function VisionDisplay({ vision }: { vision: VisionResponse }) {
  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      <VisionCard title="Situation actuelle" content={vision.situationActuelle} />
      <VisionCard title="Direction recommandée" content={vision.directionRecommandee} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <VisionListCard title="Priorités" items={vision.priorites} color="#0d6efd" />
        <VisionListCard title="À éviter" items={vision.themesAEviter} color="#dc3545" />
      </div>
      <VisionCard title="Cohérence positionnement" content={vision.coherence} />
    </div>
  )
}

function VisionCard({ title, content }: { title: string; content: string }) {
  return (
    <div style={{ padding: '16px', background: '#fff', borderRadius: '8px', border: '1px solid #dee2e6' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
        {title}
      </div>
      <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: '#333' }}>{content}</p>
    </div>
  )
}

function VisionListCard({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div style={{ padding: '16px', background: '#fff', borderRadius: '8px', border: '1px solid #dee2e6' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
        {title}
      </div>
      <ul style={{ margin: 0, paddingLeft: '16px' }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: '14px', color, marginBottom: '4px' }}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
