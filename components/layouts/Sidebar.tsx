'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const navigation = [
  { name: 'Dashboard', href: '/owner', icon: Home },
  { name: 'Clients', href: '/shared/clients', icon: Users },
  { name: 'Orders', href: '/shared/orders', icon: Briefcase },
]

export default function Sidebar({ isOpen }: { isOpen: boolean }) {
  const pathname = usePathname()

  if (!isOpen) return null

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white">
      <div className="p-6">
        <h1 className="text-2xl font-bold">Djawara HVAC</h1>
      </div>
      <nav className="space-y-1 px-3">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                isActive ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
