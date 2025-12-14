// ============================================
// Client Portal Sidebar - Professional Design
// Navigation for client portal with modern UI
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
  HelpCircle,
  Bell,
  LogOut,
  ChevronRight,
  Building2,
  Wrench
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface NavigationSection {
  title: string
  items: Array<{
    name: string
    href: string
    icon: any
    badge?: string
    description?: string
  }>
}

const navigationSections: NavigationSection[] = [
  {
    title: 'Overview',
    items: [
      { 
        name: 'Dashboard', 
        href: '/client', 
        icon: LayoutDashboard,
        description: 'Your service overview'
      }
    ]
  },
  {
    title: 'Services',
    items: [
      { 
        name: 'My Orders', 
        href: '/client/orders', 
        icon: Package,
        description: 'View service requests'
      },
      { 
        name: 'Maintenance Schedule', 
        href: '/client/maintenance-schedule', 
        icon: Calendar,
        description: 'Setup recurring maintenance'
      },
      { 
        name: 'Service Contracts', 
        href: '/client/contracts', 
        icon: FileText,
        description: 'Active contracts'
      }
    ]
  },
  {
    title: 'Assets',
    items: [
      { 
        name: 'My Properties', 
        href: '/client/properties', 
        icon: Building2,
        description: 'Manage locations'
      },
      { 
        name: 'AC Units', 
        href: '/client/units', 
        icon: Wrench,
        description: 'Equipment inventory'
      },
      { 
        name: 'Documents', 
        href: '/client/documents', 
        icon: FileDown,
        description: 'Reports & certificates'
      }
    ]
  },
  {
    title: 'Account',
    items: [
      { 
        name: 'Payments', 
        href: '/client/payments', 
        icon: CreditCard,
        description: 'Billing & invoices'
      },
      { 
        name: 'Profile', 
        href: '/client/profile', 
        icon: User,
        description: 'Account settings'
      },
      { 
        name: 'Support', 
        href: '/client/support', 
        icon: HelpCircle,
        description: 'Get help'
      }
    ]
  }
]

export function ClientSidebar() {
  const pathname = usePathname()
  const [clientName, setClientName] = useState<string>('')
  const [notificationCount, setNotificationCount] = useState(0)

  useEffect(() => {
    loadClientInfo()
    loadNotifications()
  }, [])

  const loadClientInfo = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('clients')
      .select('name')
      .eq('user_id', user.id)
      .single()

    if (data) setClientName(data.name)
  }

  const loadNotifications = async () => {
    const supabase = createClient()
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)

    setNotificationCount(count || 0)
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="w-72 bg-gradient-to-b from-slate-50 to-white border-r border-gray-200 flex flex-col shadow-sm">
      {/* Logo & Brand */}
      <div className="px-6 py-5 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">HVAC Djawara</h1>
            <p className="text-xs text-gray-500">Client Portal</p>
          </div>
        </div>
      </div>

      {/* Client Info Card */}
      {clientName && (
        <div className="mx-4 mt-4 mb-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-blue-600 mb-1">Welcome back</p>
              <p className="text-sm font-bold text-gray-900 truncate">{clientName}</p>
            </div>
            {notificationCount > 0 && (
              <Link href="/client/notifications">
                <div className="relative">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                    {notificationCount}
                  </Badge>
                </div>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-2 space-y-6 overflow-y-auto">
        {navigationSections.map((section) => (
          <div key={section.title}>
            <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn(
                        'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
                        isActive 
                          ? 'bg-white/20' 
                          : 'bg-gray-100 group-hover:bg-gray-200'
                      )}>
                        <item.icon className={cn(
                          'w-4 h-4',
                          isActive ? 'text-white' : 'text-gray-600 group-hover:text-gray-900'
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'font-medium truncate',
                          isActive ? 'text-white' : 'text-gray-900'
                        )}>
                          {item.name}
                        </p>
                        {item.description && (
                          <p className={cn(
                            'text-xs truncate mt-0.5',
                            isActive ? 'text-blue-100' : 'text-gray-500'
                          )}>
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                    {isActive && (
                      <ChevronRight className="w-4 h-4 text-white flex-shrink-0" />
                    )}
                    {item.badge && (
                      <Badge variant="secondary" className="ml-2 flex-shrink-0">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer - Sign Out */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start text-gray-700 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
        
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            Need help? <Link href="/client/support" className="text-blue-600 hover:underline font-medium">Contact Support</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
