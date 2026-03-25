'use client'
import { createContext, useContext, useState } from 'react'
import type { Idea } from '@/lib/types'

interface IdeaContextValue {
  selectedIdea: Idea | null
  setSelectedIdea: (idea: Idea | null) => void
  draggingSlug: string | null
  setDraggingSlug: (slug: string | null) => void
}

const IdeaContext = createContext<IdeaContextValue | null>(null)

export function IdeaProvider({ children }: { children: React.ReactNode }) {
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null)
  const [draggingSlug, setDraggingSlug] = useState<string | null>(null)

  return (
    <IdeaContext.Provider value={{ selectedIdea, setSelectedIdea, draggingSlug, setDraggingSlug }}>
      {children}
    </IdeaContext.Provider>
  )
}

export function useIdea(): IdeaContextValue {
  const ctx = useContext(IdeaContext)
  if (!ctx) throw new Error('useIdea must be used within IdeaProvider')
  return ctx
}
