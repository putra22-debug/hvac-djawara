// ============================================
// Client Portal Invitation Page
// Client clicks link → Set password → Activated
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2, Lock, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface InvitationData {
  is_valid: boolean
  client_id: string
  client_name: string
  client_email: string
  expires_at: string
  error_message: string | null
}

export default function ClientInvitePage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const supabase = createClient()
  
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [email, setEmail] = useState('')
  const [activating, setActivating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Validate token on mount
  useEffect(() => {
    validateToken()
  }, [params.token])

  async function validateToken() {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .rpc('validate_invitation_token', { p_token: params.token })
        .single()

      if (error) throw error

      setInvitation(data)
      if (data.is_valid && data.client_email) {
        setEmail(data.client_email)
      }
    } catch (err) {
      console.error('Error validating token:', err)
      setError('Failed to validate invitation')
    } finally {
      setLoading(false)
    }
  }

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault()
    
    if (!invitation?.is_valid) return
    
    // Validate password
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      setActivating(true)
      setError(null)

      // Call API to activate portal
      const response = await fetch('/api/client/activate-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: params.token,
          email: email,
          password: password,
          client_id: invitation.client_id,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Activation failed')
      }

      setSuccess(true)
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/client/login')
      }, 2000)
    } catch (err) {
      console.error('Error activating portal:', err)
      setError(err instanceof Error ? err.message : 'Failed to activate portal')
    } finally {
      setActivating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-600" />
            <p className="text-gray-600">Validating invitation...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Invalid token
  if (!invitation?.is_valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Invalid Invitation
            </CardTitle>
            <CardDescription>
              {invitation?.error_message || 'This invitation link is not valid'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 text-center mb-4">
              Possible reasons:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 mb-6">
              <li>• Link has expired</li>
              <li>• Link has already been used</li>
              <li>• Invalid or corrupted link</li>
            </ul>
            <Button 
              className="w-full" 
              onClick={() => router.push('/')}
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Portal Activated! 🎉
            </CardTitle>
            <CardDescription>
              Your client portal access has been successfully activated
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Redirecting to login page...
            </p>
            <Loader2 className="w-6 h-6 mx-auto animate-spin text-blue-600" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Set password form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Welcome, {invitation.client_name}!
          </CardTitle>
          <CardDescription>
            Set your password to activate your client portal access
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleActivate} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                disabled={activating}
              />
              <p className="text-xs text-gray-500">
                This will be your login email
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  placeholder="Min. 8 characters"
                  required
                  disabled={activating}
                  minLength={8}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  placeholder="Repeat password"
                  required
                  disabled={activating}
                  minLength={8}
                />
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-900">
                <strong>Invitation expires:</strong>{' '}
                {new Date(invitation.expires_at).toLocaleString('id-ID')}
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={activating || !email || !password || !confirmPassword}
            >
              {activating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Activating...
                </>
              ) : (
                'Activate Portal Access'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              By activating, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
