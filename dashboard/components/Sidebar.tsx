'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/cette-semaine', label: 'Cette semaine', icon: '◎' },
  { href: '/campagnes', label: 'Campagnes', icon: '◈' },
  { href: '/strategie', label: 'Stratégie', icon: '⊕' },
  { href: '/calendrier', label: 'Calendrier', icon: '⊞' },
  { href: '/performances', label: 'Performances', icon: '↑' },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <nav style={{ width: 200, minWidth: 200, background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', padding: '16px 0' }}>
      <div style={{ padding: '4px 20px 20px', fontWeight: 700, fontSize: 15, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>✦</span> CMO Agent
      </div>
      {NAV.map(item => (
        <Link key={item.href} href={item.href}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 20px', fontSize: 13, fontWeight: 500, textDecoration: 'none',
            background: pathname === item.href ? 'var(--color-primary-light)' : 'transparent',
            color: pathname === item.href ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }}>
          <span>{item.icon}</span>{item.label}
        </Link>
      ))}
    </nav>
  )
}
