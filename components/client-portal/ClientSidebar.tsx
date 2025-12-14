// ============================================
// Client Portal Sidebar
// Navigation for client portal
// ============================================

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Package, 
  FileText, 
  Box,
  Calendar,
  FileDown,
  CreditCard,
  User,
  HelpCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/client/dashboard', icon: LayoutDashboard },
  { name: 'My Orders', href: '/client/orders', icon: Package },
  { name: 'Contracts', href: '/client/contracts', icon: FileText },
  { name: 'My Assets', href: '/client/assets', icon: Box },
  { name: 'Schedule', href: '/client/schedule', icon: Calendar },
  { name: 'Documents', href: '/client/documents', icon: FileDown },
  { name: 'Payments', href: '/client/payments', icon: CreditCard },
  { name: 'Profile', href: '/client/profile', icon: User },
  { name: 'Support', href: '/client/support', icon: HelpCircle },
]

export function ClientSidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-blue-600">HVAC Djawara</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className={cn(
                'w-5 h-5',
                isActive ? 'text-blue-600' : 'text-gray-400'
              )} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Client Portal Badge */}
      <div className="p-4 border-t border-gray-200">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-xs font-medium text-blue-900">Client Portal</p>
          <p className="text-xs text-blue-700 mt-1">Self-Service Access</p>
        </div>
      </div>
    </div>
  )
}
