'use client'
import { useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { NoteVocalePanel } from '@/components/NoteVocalePanel'
import { VeillePanel } from '@/components/VeillePanel'
import { WeeklyPlanPanel } from '@/components/WeeklyPlanPanel'
import { QuickPostPanel } from '@/components/QuickPostPanel'
import type { VeilleItem, WeeklyPlan, WeeklyPost } from '@/lib/types'

export default function CetteSemainePage() {
  const [noteVocale, setNoteVocale] = useState('')
  const [veille, setVeille] = useState<VeilleItem[]>([])
  const [veilleLoading, setVeilleLoading] = useState(false)
  const [plan, setPlan] = useState<WeeklyPlan | null>(null)
  const [planLoading, setPlanLoading] = useState(false)

  async function handleFetchVeille() {
    setVeilleLoading(true)
    try {
      const res = await fetch('/api/cette-semaine/veille', { method: 'POST' })
      const data = await res.json() as { items: VeilleItem[] }
      setVeille(data.items ?? [])
    } catch (e) {
      console.error('Veille error:', e)
    } finally {
      setVeilleLoading(false)
    }
  }

  async function handleGeneratePlan() {
    setPlanLoading(true)
    try {
      const res = await fetch('/api/cette-semaine/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteVocale, veille }),
      })
      const data = await res.json() as { plan: WeeklyPlan }
      setPlan(data.plan ?? null)
    } catch (e) {
      console.error('Plan error:', e)
    } finally {
      setPlanLoading(false)
    }
  }

  async function handleValidate(post: WeeklyPost) {
    try {
      await fetch('/api/cette-semaine/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sujet: post.sujet,
          pilier: post.pilier,
          format: 'Post',
          hook: post.hook,
          campagneSlug: post.campagneSlug,
          ideaSlug: post.ideaSlug,
          jour: post.jour,
          semaine: plan?.semaine,
          sourceLabel: post.sourceLabel,
        }),
      })
    } catch (e) {
      console.error('Validate error:', e)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT — Inputs */}
        <div style={{
          width: 340, minWidth: 340,
          borderRight: '1px solid var(--color-border)',
          padding: '20px 16px',
          overflowY: 'auto',
          background: 'var(--color-surface)',
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-foreground)', marginBottom: 20 }}>
            Cette semaine
          </div>

          <NoteVocalePanel value={noteVocale} onChange={setNoteVocale} />
          <VeillePanel items={veille} loading={veilleLoading} onFetch={handleFetchVeille} />
          <QuickPostPanel />
        </div>

        {/* RIGHT — Weekly plan */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
          <WeeklyPlanPanel
            plan={plan}
            loading={planLoading}
            onGenerate={handleGeneratePlan}
            onValidate={handleValidate}
          />
        </div>

      </div>
    </div>
  )
}
