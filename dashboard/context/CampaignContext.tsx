'use client'
import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Campaign } from '@/lib/types'

type CampaignContextValue = {
  campaigns: Campaign[]
  setCampaigns: (campaigns: Campaign[]) => void
  selectedSlug: string | null
  setSelectedSlug: (slug: string | null) => void
}

const CampaignContext = createContext<CampaignContextValue | null>(null)

export function CampaignProvider({ children, initialCampaigns }: { children: ReactNode; initialCampaigns: Campaign[] }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    initialCampaigns[0]?.slug ?? null
  )

  return (
    <CampaignContext.Provider value={{ campaigns, setCampaigns, selectedSlug, setSelectedSlug }}>
      {children}
    </CampaignContext.Provider>
  )
}

export function useCampaigns() {
  const ctx = useContext(CampaignContext)
  if (!ctx) throw new Error('useCampaigns must be used inside CampaignProvider')
  return ctx
}
