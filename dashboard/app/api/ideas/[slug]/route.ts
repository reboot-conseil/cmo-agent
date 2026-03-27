import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { readIdea, writeIdea, deleteIdea, listIdeas } from '@/lib/parse-ideas'
import { syncCalendarFile } from '@/lib/calendar-sync'
import type { Idea } from '@/lib/types'

export async function DELETE(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  try {
    const { slug } = await params
    const existing = await readIdea(userId, slug)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await deleteIdea(userId, slug)
    await syncCalendarFile(userId, await listIdeas(userId))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  try {
    const { slug } = await params
    const existing = await readIdea(userId, slug)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updates = await request.json() as Partial<Idea>

    // Swap: if assigning a slot already taken, move the occupant
    if (updates.semaine != null && updates.jour != null) {
      const all = await listIdeas(userId)
      const occupant = all.find(i => i.slug !== slug && i.semaine === updates.semaine && i.jour === updates.jour)
      if (occupant) {
        // If the dragged card comes from a calendar slot → true swap
        // If it comes from the backlog (semaine: null) → send occupant to backlog
        const fromCalendar = existing.semaine != null && existing.jour != null
        await writeIdea(userId, {
          ...occupant,
          semaine: fromCalendar ? existing.semaine : null,
          jour: fromCalendar ? existing.jour : null,
          statut: occupant.statut === 'scheduled' ? 'scheduled' : occupant.statut,
        })
      }
    }

    const updated: Idea = { ...existing, ...updates }
    await writeIdea(userId, updated)

    // Regenerate calendar.md
    await syncCalendarFile(userId, await listIdeas(userId))

    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
