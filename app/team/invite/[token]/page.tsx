'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Loader2, Users, XCircle, Eye, EyeOff } from 'lucide-react'

type InvitationRow = {
  id: string
  tenant_id: string
  email: string
  full_name: string
  phone: string | null
  role: string
  token: string
  expires_at: string
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
  user_id: string | null
}

export default function TeamInvitePage({ params }: { params: { token: string } }) {
  const router = useRouter()

  const token = useMemo(() => String(params?.token || '').trim(), [params?.token])

  const [invitation, setInvitation] = useState<InvitationRow | null>(null)
  const [loading, setLoading] = useState(true)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchInvitation() {
      try {
        setLoading(true)
        setError(null)

        if (!token) {
          setInvitation(null)
          setError('Link undangan tidak valid')
          return
        }

        const res = await fetch('/api/people/team-invite-meta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        const json = await res.json()
        if (!res.ok) {
          throw new Error(json?.error || 'Gagal memuat undangan')
        }

        if (!cancelled) {
          setInvitation((json?.invitation as InvitationRow) || null)
          // If invalid, show server reason for better debugging
          if (json?.isValid === false && json?.reason) {
            setError(String(json.reason))
          }
        }
      } catch (err: any) {
        console.error('Fetch invitation error:', err)
        if (!cancelled) setError('Gagal memuat undangan. Coba lagi.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchInvitation()

    return () => {
      cancelled = true
    }
  }, [token])

  const isValid = useMemo(() => {
    if (!invitation) return false
    if (invitation.status !== 'pending') return false
    if (invitation.user_id) return false
    const exp = new Date(invitation.expires_at).getTime()
    if (Number.isFinite(exp) && Date.now() > exp) return false
    return true
  }, [invitation])

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault()

    if (!invitation) return

    if (!isValid) {
      setError('Link undangan tidak valid atau sudah expired')
      return
    }

    if (password.trim().length < 6) {
      setError('Password minimal 6 karakter')
      return
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak sama')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const res = await fetch('/api/people/complete-team-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error || 'Gagal aktivasi')
      }

      setSuccess(true)

      // Redirect based on returned target
      const target = String(json?.redirectTo || '/dashboard')
      setTimeout(() => {
        router.push(target)
      }, 1200)
    } catch (err: any) {
      console.error('Activate invite error:', err)
      setError(err?.message || 'Gagal aktivasi')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Memuat undangan...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!invitation || !isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Undangan Tidak Valid</CardTitle>
            <CardDescription>
              {error || 'Link undangan tidak valid, sudah digunakan, atau sudah expired.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push('/login')}>
              Kembali ke Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Aktivasi Berhasil</CardTitle>
            <CardDescription>Anda akan dialihkan otomatis...</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Loader2 className="w-6 h-6 mx-auto animate-spin" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Aktivasi Akun Tim</CardTitle>
          <CardDescription>Set password untuk mengaktifkan akun</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-1">Akun untuk:</p>
            <p className="font-semibold text-gray-900">{invitation.full_name}</p>
            <p className="text-sm text-gray-600 mt-1">{invitation.email}</p>
            <p className="text-xs text-gray-500 mt-1">Role: {invitation.role}</p>
          </div>

          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleActivate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimal 6 karakter</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Konfirmasi Password</label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button className="w-full" type="submit" disabled={submitting}>
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Memproses...
                </span>
              ) : (
                'Aktifkan Akun'
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Setelah aktivasi, Anda bisa login via halaman utama.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
