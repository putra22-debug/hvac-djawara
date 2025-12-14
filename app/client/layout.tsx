// ============================================
// Client Portal Layout
// Separate layout for client-facing portal
// ============================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClientSidebar } from '@/components/client-portal/ClientSidebar'
import { ClientHeader } from '@/components/client-portal/ClientHeader'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  // Check if user is authenticated
  if (!user) {
    redirect('/client/login')
  }

  // Check if user is a client (not staff)
  const accountType = user.user_metadata?.account_type
  if (accountType !== 'client') {
    redirect('/login') // Redirect staff to staff login
  }

  // Get client data
  const clientId = user.user_metadata?.client_id
  if (!clientId) {
    redirect('/client/login')
  }

  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single()

  if (error || !client) {
    redirect('/client/login')
  }

  // Check if portal access is enabled
  if (!client.portal_enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md p-6 bg-white rounded-lg shadow-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Portal Access Disabled
          </h1>
          <p className="text-gray-600 mb-4">
            Your portal access has been disabled. Please contact our customer service for assistance.
          </p>
          <a 
            href="mailto:support@hvac-djawara.com"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            support@hvac-djawara.com
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <ClientSidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <ClientHeader user={user} client={client} />
        
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
