// ============================================
// Dashboard Layout
// Sidebar + Header + Main Content
// ============================================

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is a technician - they should use /technician routes
  const { data: techData } = await supabase
    .from('technicians')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (techData) {
    // Redirect technicians to their dashboard
    redirect('/technician/dashboard')
  }

  // Also check user_tenant_roles
  const { data: userRole } = await supabase
    .from('user_tenant_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (userRole?.role === 'technician' || userRole?.role === 'helper') {
    // Redirect technicians to their dashboard
    redirect('/technician/dashboard')
  }

  // Get user profile with tenant info
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, tenants:active_tenant_id(*)')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} profile={profile} />
        
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
