// ============================================
// Client Portal Auth Hook
// Handle client authentication separately from staff
// ============================================

'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export interface ClientUser {
  id: string
  email: string
  client_id: string
  client_name: string
}

export function useClientAuth() {
  const [clientUser, setClientUser] = useState<ClientUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  // Check if current user is a client
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true)
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError) throw authError

        if (!user) {
          setClientUser(null)
          setLoading(false)
          return
        }

        // Check if user is a client (not staff)
        const accountType = user.user_metadata?.account_type
        if (accountType !== 'client') {
          setClientUser(null)
          setError('Not a client account')
          setLoading(false)
          return
        }

        // Get client data
        const clientId = user.user_metadata?.client_id
        if (!clientId) {
          throw new Error('Client ID not found in user metadata')
        }

        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('id, name, portal_enabled')
          .eq('id', clientId)
          .single()

        if (clientError) throw clientError

        if (!client.portal_enabled) {
          throw new Error('Portal access disabled')
        }

        setClientUser({
          id: user.id,
          email: user.email!,
          client_id: client.id,
          client_name: client.name,
        })
      } catch (err) {
        console.error('Error checking auth:', err)
        setError(err instanceof Error ? err.message : 'Authentication failed')
        setClientUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAuth()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  // Client login
  const login = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (loginError) throw loginError

      // Verify this is a client account
      const accountType = data.user?.user_metadata?.account_type
      if (accountType !== 'client') {
        await supabase.auth.signOut()
        throw new Error('Invalid account type. Please use client credentials.')
      }

      // Update last login
      const clientId = data.user?.user_metadata?.client_id
      if (clientId) {
        await supabase
          .from('clients')
          .update({ portal_last_login: new Date().toISOString() })
          .eq('id', clientId)

        // Log activity
        await supabase.rpc('log_client_activity', {
          p_activity_type: 'login',
          p_metadata: { ip: 'unknown', user_agent: navigator.userAgent },
        })
      }

      router.push('/client/dashboard')
      return { success: true, user: data.user }
    } catch (err) {
      console.error('Login error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Login failed'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  // Client logout
  const logout = async () => {
    try {
      setLoading(true)
      
      // Log activity before logout
      if (clientUser) {
        await supabase.rpc('log_client_activity', {
          p_activity_type: 'logout',
        }).catch(() => {}) // Ignore errors on logout
      }

      const { error: logoutError } = await supabase.auth.signOut()
      if (logoutError) throw logoutError

      setClientUser(null)
      router.push('/client/login')
    } catch (err) {
      console.error('Logout error:', err)
      setError(err instanceof Error ? err.message : 'Logout failed')
    } finally {
      setLoading(false)
    }
  }

  // Request password reset
  const requestPasswordReset = async (email: string) => {
    try {
      setLoading(true)
      setError(null)

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/client/reset-password`,
      })

      if (resetError) throw resetError

      return { success: true }
    } catch (err) {
      console.error('Password reset error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Password reset failed'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  return {
    clientUser,
    loading,
    error,
    login,
    logout,
    requestPasswordReset,
    isAuthenticated: !!clientUser,
  }
}
