'use client'
import { createContext, useContext, useState } from 'react'
import type { Idea, Jour } from '@/lib/types'

interface IdeaContextValue {
  ideas: Idea[]
  selectedIdea: Idea | null
  setSelectedIdea: (idea: Idea | null) => void
  moveIdea: (slug: string, semaine: number, jour: Jour) => void
  returnToBacklog: (slug: string) => void
  addIdea: (idea: Idea) => void
  removeIdea: (slug: string) => void
}

const IdeaContext = createContext<IdeaContextValue | null>(null)

export function IdeaProvider({ children, initialIdeas }: { children: React.ReactNode; initialIdeas: Idea[] }) {
  const [ideas, setIdeas] = useState<Idea[]>(initialIdeas)
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null)

  function moveIdea(slug: string, semaine: number, jour: Jour) {
    setIdeas(prev => {
      const dragged = prev.find(i => i.slug === slug)
      if (!dragged) return prev
      return prev.map(i => {
        if (i.slug === slug) return { ...i, semaine, jour, statut: 'scheduled' as const }
        if (i.semaine === semaine && i.jour === jour) {
          const fromCalendar = dragged.semaine != null && dragged.jour != null
          return { ...i, semaine: fromCalendar ? dragged.semaine : null, jour: fromCalendar ? dragged.jour : null }
        }
        return i
      })
    })
    fetch(`/api/ideas/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ semaine, jour, statut: 'scheduled' }),
    })
  }

  function returnToBacklog(slug: string) {
    setIdeas(prev => prev.map(i =>
      i.slug === slug ? { ...i, semaine: null, jour: null, statut: 'raw' as const } : i
    ))
    fetch(`/api/ideas/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ semaine: null, jour: null, statut: 'raw' }),
    })
  }

  function addIdea(idea: Idea) { setIdeas(prev => [...prev, idea]) }
  function removeIdea(slug: string) { setIdeas(prev => prev.filter(i => i.slug !== slug)) }

  return (
    <IdeaContext.Provider value={{ ideas, selectedIdea, setSelectedIdea, moveIdea, returnToBacklog, addIdea, removeIdea }}>
      {children}
    </IdeaContext.Provider>
  )
}

export function useIdea(): IdeaContextValue {
  const ctx = useContext(IdeaContext)
  if (!ctx) throw new Error('useIdea must be used within IdeaProvider')
  return ctx
}
